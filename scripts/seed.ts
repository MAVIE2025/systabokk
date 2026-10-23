/**
 * Données de démonstration : 2 créateurs fictifs, 4 API, 1 prise standard et
 * un compte « Pass Jury » crédité. Relançable sans doublon.
 *
 *   npm run db:seed
 *
 * La clé du Pass Jury est affichée une seule fois. Pour la fixer, définissez PASS_JURY_KEY.
 */
import { Pool } from "pg";
import { generateApiKey, hashApiKey } from "../src/lib/keys";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function upsertDev(name: string, email: string, country: string): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `insert into devs (name, email, country) values ($1, $2, $3)
     on conflict (email) do update set name = excluded.name, country = excluded.country
     returning id`,
    [name, email, country],
  );
  await pool.query("insert into wallets (dev_id) values ($1) on conflict do nothing", [rows[0].id]);
  return rows[0].id;
}

async function upsertApi(a: {
  slug: string; name: string; description: string; category: string; countries: string;
  owner: string; upstream: string; price: number; prise?: string; priority?: number;
}) {
  await pool.query(
    `insert into apis (slug, name, description, category, countries, owner_dev_id, upstream_url, price_fcfa, prise_slug, prise_priority)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     on conflict (slug) do update set name = excluded.name, description = excluded.description,
       category = excluded.category, countries = excluded.countries, owner_dev_id = excluded.owner_dev_id,
       upstream_url = excluded.upstream_url, price_fcfa = excluded.price_fcfa,
       prise_slug = excluded.prise_slug, prise_priority = excluded.prise_priority, is_active = true`,
    [a.slug, a.name, a.description, a.category, a.countries, a.owner, a.upstream, a.price, a.prise ?? null, a.priority ?? 100],
  );
}

async function main() {
  const aminata = await upsertDev("Aminata (démo)", "aminata@demo.systabokk.dev", "BF");
  const moussa = await upsertDev("Moussa (démo)", "moussa@demo.systabokk.dev", "SN");
  const jury = await upsertDev("Pass Jury", "jury@demo.systabokk.dev", "BF");

  await pool.query(
    `insert into prises (slug, name, description) values ($1, $2, $3)
     on conflict (slug) do update set name = excluded.name, description = excluded.description`,
    [
      "paiement-mobile",
      "Paiement mobile",
      "Interface commune pour encaisser par Mobile Money. POST /paiements { montant, telephone, reference }.",
    ],
  );

  await upsertApi({
    slug: "montant-en-lettres", name: "Montant en lettres",
    description: "Écrit un montant en toutes lettres, en français, avec la phrase prête pour la facture.",
    category: "Facturation", countries: "BF,SN,CI,ML,NE,TG,BJ", owner: aminata,
    upstream: "internal:/demo-apis/montant-en-lettres", price: 2,
  });
  await upsertApi({
    slug: "telephone", name: "Validation de numéro",
    description: "Vérifie le format d'un numéro et le renvoie au format international (+226…).",
    category: "Identité", countries: "BF,SN,CI,ML,NE,TG,BJ,GN,CM", owner: moussa,
    upstream: "internal:/demo-apis/telephone", price: 1,
  });
  await upsertApi({
    slug: "paiement-a", name: "Paiement mobile — Fournisseur A (test)",
    description: "Encaissement Mobile Money simulé. Fournisseur prioritaire de la prise « paiement-mobile ».",
    category: "Paiement", countries: "BF,SN,CI", owner: aminata,
    upstream: "internal:/demo-apis/paiement/a", price: 25, prise: "paiement-mobile", priority: 1,
  });
  await upsertApi({
    slug: "paiement-b", name: "Paiement mobile — Fournisseur B (test)",
    description: "Encaissement Mobile Money simulé. Prend le relais si le fournisseur A tombe.",
    category: "Paiement", countries: "BF,SN,CI", owner: moussa,
    upstream: "internal:/demo-apis/paiement/b", price: 25, prise: "paiement-mobile", priority: 2,
  });

  // Clé du Pass Jury : on révoque les anciennes et on en crée une
  const fixed = process.env.PASS_JURY_KEY;
  const k = fixed ? { key: fixed, hash: hashApiKey(fixed), prefix: fixed.slice(0, 13) } : generateApiKey();
  await pool.query("update api_keys set revoked_at = now() where dev_id = $1 and revoked_at is null and key_hash <> $2", [jury, k.hash]);
  await pool.query(
    `insert into api_keys (dev_id, key_hash, prefix, label) values ($1, $2, $3, 'Pass Jury')
     on conflict (key_hash) do update set revoked_at = null`,
    [jury, k.hash, k.prefix],
  );

  // Crédit de démonstration du Pass Jury : on le remet à 5 000 FCFA
  const { rows } = await pool.query<{ balance_fcfa: number }>("select balance_fcfa from wallets where dev_id = $1", [jury]);
  const topUp = 5000 - (rows[0]?.balance_fcfa ?? 0);
  if (topUp > 0) {
    await pool.query("update wallets set balance_fcfa = balance_fcfa + $2 where dev_id = $1", [jury, topUp]);
    await pool.query(
      "insert into ledger (dev_id, amount_fcfa, kind, note) values ($1, $2, 'recharge', 'crédit de démonstration (fictif)')",
      [jury, topUp],
    );
  }

  console.log("Données de démo prêtes : 4 API, 1 prise, 3 comptes.");
  console.log(`Clé Pass Jury : ${k.key}`);
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
