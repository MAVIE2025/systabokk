"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { pool } from "@/db";
import { generateApiKey } from "@/lib/keys";
import { devConnecte, type DevSession } from "@/lib/session";

/**
 * Actions de l'espace admin. Chacune revérifie côté serveur que la personne connectée
 * a le rôle « admin » (on ne fait jamais confiance au simple affichage du bouton),
 * puis inscrit ce qu'elle a fait dans le journal admin_actions.
 */

export type EtatAdmin = { ok?: string; erreur?: string; cle?: string };

async function exigerAdmin(): Promise<DevSession> {
  const dev = await devConnecte();
  if (!dev?.estAdmin) throw new Error("Accès réservé aux administrateurs.");
  return dev;
}

async function journaliser(admin: DevSession, action: string, cible: string | null, details?: string) {
  await pool.query(
    "insert into admin_actions (admin_dev_id, action, cible, details) values ($1, $2, $3, $4)",
    [admin.id, action, cible, details ?? null],
  );
}

const uuid = z.string().uuid();
const texte = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

async function compte(id: string) {
  const { rows } = await pool.query<{ id: string; email: string; role: string; blocked_at: Date | null }>(
    "select id, email, role, blocked_at from devs where id = $1",
    [id],
  );
  return rows[0] ?? null;
}

/* ---------- Comptes ---------- */

export async function bloquerCompte(_: EtatAdmin, f: FormData): Promise<EtatAdmin> {
  const admin = await exigerAdmin();
  const id = uuid.safeParse(texte(f, "devId"));
  const motif = texte(f, "motif").slice(0, 200);
  if (!id.success) return { erreur: "Compte invalide." };
  if (motif.length < 3) return { erreur: "Indiquez le motif du blocage (3 caractères au moins)." };
  if (id.data === admin.id) return { erreur: "Vous ne pouvez pas bloquer votre propre compte." };
  const c = await compte(id.data);
  if (!c) return { erreur: "Compte introuvable." };

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("update devs set blocked_at = now(), blocked_reason = $2 where id = $1", [c.id, motif]);
    // Ses API disparaissent du catalogue et ne sont plus appelables
    await client.query("update apis set is_active = false where owner_dev_id = $1 and deleted_at is null", [c.id]);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
  await journaliser(admin, "bloquer_compte", c.email, motif);
  revalidatePath("/", "layout");
  return { ok: `Compte ${c.email} bloqué. Sa clé est refusée partout et ses API sont masquées.` };
}

export async function debloquerCompte(f: FormData) {
  const admin = await exigerAdmin();
  const id = uuid.parse(texte(f, "devId"));
  const c = await compte(id);
  if (!c) return;
  await pool.query("update devs set blocked_at = null, blocked_reason = null where id = $1", [c.id]);
  await pool.query("update apis set is_active = true where owner_dev_id = $1 and deleted_at is null", [c.id]);
  await journaliser(admin, "debloquer_compte", c.email);
  revalidatePath("/", "layout");
}

/**
 * « Mot de passe oublié » : SystaBokk ne stocke jamais les clés en clair (seulement leur empreinte),
 * donc personne ne peut les relire. L'admin en génère une nouvelle, l'ancienne cesse de marcher,
 * et il transmet la nouvelle au développeur.
 */
export async function reinitialiserCle(_: EtatAdmin, f: FormData): Promise<EtatAdmin> {
  const admin = await exigerAdmin();
  const id = uuid.safeParse(texte(f, "devId"));
  if (!id.success) return { erreur: "Compte invalide." };
  const c = await compte(id.data);
  if (!c) return { erreur: "Compte introuvable." };
  if (c.id === admin.id) return { erreur: "Pour votre propre clé admin, changez ADMIN_KEY dans la configuration du serveur." };

  const k = generateApiKey();
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("update api_keys set revoked_at = now() where dev_id = $1 and revoked_at is null", [c.id]);
    await client.query("insert into api_keys (dev_id, key_hash, prefix) values ($1, $2, $3)", [c.id, k.hash, k.prefix]);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
  await journaliser(admin, "reinitialiser_cle", c.email, `nouvelle clé ${k.prefix}…`);
  revalidatePath("/admin");
  return { ok: `Nouvelle clé pour ${c.email}. Transmettez-la au développeur : elle ne sera plus affichée.`, cle: k.key };
}

export async function basculerAdmin(f: FormData) {
  const admin = await exigerAdmin();
  const id = uuid.parse(texte(f, "devId"));
  if (id === admin.id) return; // on ne se retire pas soi-même ses droits
  const c = await compte(id);
  if (!c) return;
  const nouveau = c.role === "admin" ? "dev" : "admin";
  await pool.query("update devs set role = $2 where id = $1", [c.id, nouveau]);
  await journaliser(admin, nouveau === "admin" ? "donner_admin" : "retirer_admin", c.email);
  revalidatePath("/", "layout");
}

/* ---------- API ---------- */

async function apiParId(id: string) {
  const { rows } = await pool.query<{ id: string; slug: string }>("select id, slug from apis where id = $1 and deleted_at is null", [id]);
  return rows[0] ?? null;
}

export async function suspendreApi(f: FormData) {
  const admin = await exigerAdmin();
  const a = await apiParId(uuid.parse(texte(f, "apiId")));
  if (!a) return;
  const actif = texte(f, "actif") === "1";
  await pool.query("update apis set is_active = $2 where id = $1", [a.id, actif]);
  await journaliser(admin, actif ? "reactiver_api" : "suspendre_api", a.slug);
  revalidatePath("/", "layout");
}

/** Suppression « douce » : l'API disparaît partout mais reste dans l'historique des appels et des paiements. */
export async function supprimerApi(f: FormData) {
  const admin = await exigerAdmin();
  const a = await apiParId(uuid.parse(texte(f, "apiId")));
  if (!a) return;
  await pool.query("update apis set is_active = false, deleted_at = now() where id = $1", [a.id]);
  await journaliser(admin, "supprimer_api", a.slug, texte(f, "motif").slice(0, 200) || undefined);
  revalidatePath("/", "layout");
}

/* ---------- Gains de la plateforme ---------- */

const schemaRetrait = z.object({
  montant: z.coerce.number().int("Montant entier en FCFA.").min(100, "100 FCFA au minimum."),
  moyen: z.enum(["Orange Money", "Moov Money", "Wave", "Virement bancaire", "Crédits Systalink"], { message: "Choisissez le moyen." }),
  reference: z.string().trim().min(3, "Référence de l'opération (3 caractères au moins).").max(80),
});

/**
 * Enregistre un retrait des commissions de la plateforme (mode test : aucun argent ne bouge,
 * l'opération est seulement inscrite au grand livre). Le verrou empêche deux retraits simultanés
 * de dépasser le disponible.
 */
export async function enregistrerRetrait(_: EtatAdmin, f: FormData): Promise<EtatAdmin> {
  const admin = await exigerAdmin();
  const p = schemaRetrait.safeParse(Object.fromEntries(f));
  if (!p.success) return { erreur: p.error.issues[0].message };

  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("select pg_advisory_xact_lock(424242)");
    const { rows } = await client.query<{ dispo: string }>(
      "select coalesce(sum(amount_fcfa) filter (where kind in ('commission', 'retrait')), 0) as dispo from ledger where dev_id is null",
    );
    if (p.data.montant > Number(rows[0].dispo)) {
      await client.query("rollback");
      return { erreur: `Montant trop élevé : ${Number(rows[0].dispo).toLocaleString("fr-FR")} FCFA disponibles.` };
    }
    await client.query(
      "insert into ledger (dev_id, amount_fcfa, kind, note) values (null, $1, 'retrait', $2)",
      [-p.data.montant, `${p.data.moyen} · ${p.data.reference}`],
    );
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
  await journaliser(admin, "retrait", null, `${p.data.montant} FCFA · ${p.data.moyen} · ${p.data.reference}`);
  revalidatePath("/admin");
  return { ok: `Retrait de ${p.data.montant.toLocaleString("fr-FR")} FCFA enregistré (${p.data.moyen}).` };
}
