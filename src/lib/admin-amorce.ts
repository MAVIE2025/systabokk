import type { Pool } from "pg";
import { hashApiKey } from "@/lib/keys";

/**
 * Crée (ou retrouve) le compte administrateur Systalink à partir de ADMIN_KEY.
 * L'admin se connecte par le même portail que tout le monde (« Mon compte ») avec cette clé ;
 * son rôle « admin » fait alors apparaître l'onglet Admin.
 * Sans ADMIN_KEY valable, aucun admin n'est créé (on peut aussi en nommer depuis l'espace admin).
 */
export async function amorcerAdmin(pool: Pool): Promise<void> {
  const cle = process.env.ADMIN_KEY?.trim();
  if (!cle) return;
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
