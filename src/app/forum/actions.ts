"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { pool } from "@/db";
import { devConnecte } from "@/lib/session";
import { CATEGORIES } from "@/lib/categories";
import { DELAI_RELANCE_HEURES } from "@/lib/forum";

/**
 * Actions du forum. Chaque action revérifie côté serveur qui est connecté
 * et si cette personne a le droit d'agir (auteur du sujet, admin…).
 */

export type EtatForum = { erreur?: string; ok?: string };

const uuid = z.string().uuid();
const texte = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

const schemaSujet = z.object({
  type: z.enum(["question", "recherche_api"], { message: "Choisissez le type de sujet." }),
  titre: z.string().trim().min(8, "Titre trop court (8 caractères au moins).").max(140, "Titre trop long (140 caractères au plus)."),
  corps: z.string().trim().min(15, "Expliquez un peu plus (15 caractères au moins).").max(4000, "Texte trop long (4 000 caractères au plus)."),
  categorie: z.union([z.enum(CATEGORIES.map((c) => c.slug) as [string, ...string[]]), z.literal("")]),
});

export async function poserSujet(_: EtatForum, f: FormData): Promise<EtatForum> {
  const dev = await devConnecte();
  if (!dev) return { erreur: "Connectez-vous (ou entrez avec le Pass Jury) pour poser une question." };
  const p = schemaSujet.safeParse({ type: texte(f, "type"), titre: texte(f, "titre"), corps: texte(f, "corps"), categorie: texte(f, "categorie") });
  if (!p.success) return { erreur: p.error.issues[0].message };
  const { rows } = await pool.query<{ id: string }>(
    "insert into forum_sujets (auteur_dev_id, type, titre, corps, categorie) values ($1, $2, $3, $4, $5) returning id",
    [dev.id, p.data.type, p.data.titre, p.data.corps, p.data.categorie || null],
  );
  revalidatePath("/forum");
  redirect(`/forum/${rows[0].id}`);
}

type Sujet = { id: string; auteur_dev_id: string; statut: string; relance_at: Date; supprime_at: Date | null };

async function sujet(id: string): Promise<Sujet | null> {
  const { rows } = await pool.query<Sujet>(
    "select id, auteur_dev_id, statut, relance_at, supprime_at from forum_sujets where id = $1",
    [id],
  );
  const s = rows[0];
  return s && !s.supprime_at ? s : null;
}

export async function repondre(_: EtatForum, f: FormData): Promise<EtatForum> {
  const dev = await devConnecte();
  if (!dev) return { erreur: "Connectez-vous pour répondre." };
  const id = uuid.safeParse(texte(f, "sujetId"));
  if (!id.success) return { erreur: "Sujet introuvable." };
  const s = await sujet(id.data);
  if (!s) return { erreur: "Sujet introuvable." };
  if (s.statut === "resolu") return { erreur: "Ce sujet est déjà résolu." };

  const corps = texte(f, "corps");
  if (corps.length < 5) return { erreur: "Réponse trop courte (5 caractères au moins)." };
  if (corps.length > 4000) return { erreur: "Réponse trop longue (4 000 caractères au plus)." };

  // API du catalogue proposée en réponse : elle doit exister et être active
  const apiSlug = texte(f, "apiSlug") || null;
  if (apiSlug) {
    const { rowCount } = await pool.query("select 1 from apis where slug = $1 and is_active and deleted_at is null", [apiSlug]);
    if (!rowCount) return { erreur: "Cette API n'est pas (ou plus) au catalogue." };
  }

  await pool.query(
    "insert into forum_reponses (sujet_id, auteur_dev_id, corps, api_slug) values ($1, $2, $3, $4)",
    [s.id, dev.id, corps, apiSlug],
  );
  revalidatePath(`/forum/${s.id}`);
  revalidatePath("/forum");
  return { ok: "Réponse publiée." };
}

/** L'auteur du sujet valide la réponse qui l'a aidé : le sujet passe « Résolu ». */
export async function validerReponse(f: FormData) {
  const dev = await devConnecte();
  if (!dev) return;
  const s = await sujet(uuid.parse(texte(f, "sujetId")));
  if (!s || s.auteur_dev_id !== dev.id || s.statut === "resolu") return;
  const reponseId = uuid.parse(texte(f, "reponseId"));
  const { rowCount } = await pool.query(
    "select 1 from forum_reponses where id = $1 and sujet_id = $2 and supprime_at is null",
    [reponseId, s.id],
  );
  if (!rowCount) return;
  await pool.query(
    "update forum_sujets set statut = 'resolu', reponse_validee_id = $2, resolu_at = now() where id = $1",
    [s.id, reponseId],
  );
  revalidatePath(`/forum/${s.id}`);
  revalidatePath("/forum");
}

/**
 * L'auteur relance son sujet : il repasse « Ouvert », remonte en tête de liste
 * et repart pour 7 jours. Possible quand il est oublié, ou au plus une fois par 24 h.
 */
export async function relancer(f: FormData) {
  const dev = await devConnecte();
  if (!dev) return;
  const s = await sujet(uuid.parse(texte(f, "sujetId")));
  if (!s || s.auteur_dev_id !== dev.id || s.statut === "resolu") return;
  const age = (Date.now() - new Date(s.relance_at).getTime()) / 3_600_000;
  if (age < DELAI_RELANCE_HEURES) return;
  await pool.query("update forum_sujets set relance_at = now(), nb_relances = nb_relances + 1 where id = $1", [s.id]);
  revalidatePath(`/forum/${s.id}`);
  revalidatePath("/forum");
}

/** Modération : l'admin retire un sujet ou une réponse (gardés en base, journalisés). */
export async function retirerContenu(f: FormData) {
  const dev = await devConnecte();
  if (!dev?.estAdmin) return;
  const sujetId = uuid.parse(texte(f, "sujetId"));
  const reponseId = texte(f, "reponseId");
  if (reponseId) {
    await pool.query("update forum_reponses set supprime_at = now() where id = $1 and sujet_id = $2", [uuid.parse(reponseId), sujetId]);
    await pool.query("update forum_sujets set statut = 'ouvert', reponse_validee_id = null, resolu_at = null where id = $1 and reponse_validee_id = $2", [sujetId, reponseId]);
  } else {
    await pool.query("update forum_sujets set supprime_at = now() where id = $1", [sujetId]);
  }
  await pool.query(
    "insert into admin_actions (admin_dev_id, action, cible, details) values ($1, $2, $3, null)",
    [dev.id, reponseId ? "retirer_reponse_forum" : "retirer_sujet_forum", reponseId || sujetId],
  );
  revalidatePath("/forum");
  revalidatePath(`/forum/${sujetId}`);
  if (!reponseId) redirect("/forum");
}
