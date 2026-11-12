import type { Pool } from "pg";
import { generateApiKey, hashApiKey } from "@/lib/keys";

/**
 * Crée (ou retrouve) le compte administrateur Systalink à partir de ADMIN_KEY.
 * L'admin se connecte par le même portail que tout le monde (« Mon compte ») avec cette clé ;
 * son rôle « admin » fait alors apparaître l'onglet Admin.
 * Accès par défaut : sans ADMIN_KEY et tant qu'aucun admin n'existe, une clé admin aléatoire est
 * générée au premier démarrage et affichée UNE fois dans les journaux du serveur (jamais dans le code,
 * jamais en clair dans la base). Définir ADMIN_KEY ensuite permet de choisir sa propre clé.
 */
export async function amorcerAdmin(pool: Pool): Promise<void> {
  let cle = process.env.ADMIN_KEY?.trim();
  if (!cle) {
    const { rows } = await pool.query("select 1 from devs where role = 'admin' limit 1");
    if (rows.length > 0) return; // un admin existe déjà : rien à faire
    cle = generateApiKey().key;
    const ligne = "=".repeat(72);
    console.log(`\n${ligne}\n[démarrage] ACCÈS ADMIN PAR DÉFAUT créé (affiché une seule fois) :\n\n  ${cle}\n\n` +
      `Collez cette clé dans « Mon compte » pour ouvrir l'espace Admin.\n` +
      `Conservez-la, ou définissez ADMIN_KEY pour choisir la vôtre.\n${ligne}\n`);
  }
  if (!cle.startsWith("sbk_") || cle.length < 32) {
    console.warn("[démarrage] ADMIN_KEY ignorée : elle doit commencer par « sbk_ » et faire 32 caractères au moins.");
    return;
  }
  const email = (process.env.ADMIN_EMAIL ?? "admin@systabokk.dev").trim().toLowerCase();
  const { rows } = await pool.query<{ id: string }>(
    `insert into devs (name, email, country, role) values ('Systalink (admin)', $1, 'SN', 'admin')
     on conflict (email) do update set role = 'admin', blocked_at = null, blocked_reason = null
     returning id`,
    [email],
  );
  const id = rows[0].id;
  await pool.query("insert into wallets (dev_id) values ($1) on conflict do nothing", [id]);
  const hash = hashApiKey(cle);
  await pool.query(
    `insert into api_keys (dev_id, key_hash, prefix, label) values ($1, $2, $3, 'Admin')
     on conflict (key_hash) do update set dev_id = excluded.dev_id, revoked_at = null`,
    [id, hash, cle.slice(0, 13)],
  );
  console.log("[démarrage] compte admin prêt");
}
