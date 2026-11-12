import type { Pool } from "pg";
import { generateApiKey, hashApiKey } from "@/lib/keys";

/**
 * Données de démonstration : créateurs fictifs, 8 API de types variés, 2 prises standard
 * et un compte « Pass Jury » crédité. Idempotent : relançable sans doublon.
 * La clé du Pass Jury vient de PASS_JURY_KEY ; sans elle, une clé est générée et renvoyée.
 */
export async function seedDemo(pool: Pool): Promise<{ cleJury: string }> {
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
    method?: string; path?: string; body?: unknown;
  }) {
    await pool.query(
      `insert into apis (slug, name, description, category, countries, owner_dev_id, upstream_url, price_fcfa,
                         prise_slug, prise_priority, example_method, example_path, example_body)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       on conflict (slug) do update set name = excluded.name, description = excluded.description,
         category = excluded.category, countries = excluded.countries, owner_dev_id = excluded.owner_dev_id,
         upstream_url = excluded.upstream_url, price_fcfa = excluded.price_fcfa,
         prise_slug = excluded.prise_slug, prise_priority = excluded.prise_priority,
         example_method = excluded.example_method, example_path = excluded.example_path,
         example_body = excluded.example_body, is_active = true`,
      [a.slug, a.name, a.description, a.category, a.countries, a.owner, a.upstream, a.price,
       a.prise ?? null, a.priority ?? 100, a.method ?? "GET", a.path ?? "", a.body ? JSON.stringify(a.body, null, 2) : null],
    );
  }

  async function upsertPrise(slug: string, name: string, description: string) {
    await pool.query(
      `insert into prises (slug, name, description) values ($1, $2, $3)
       on conflict (slug) do update set name = excluded.name, description = excluded.description`,
      [slug, name, description],
    );
  }

    const aminata = await upsertDev("Aminata (démo)", "aminata@demo.systabokk.dev", "BF");
    const moussa = await upsertDev("Moussa (démo)", "moussa@demo.systabokk.dev", "SN");
    const awa = await upsertDev("Awa (démo)", "awa@demo.systabokk.dev", "CI");
    const jury = await upsertDev("Pass Jury", "jury@demo.systabokk.dev", "BF");

    await upsertPrise("paiement-mobile", "Paiement mobile",
      "Interface commune pour encaisser par Mobile Money. POST /paiements { montant, telephone, reference }.");
    await upsertPrise("sms", "Envoi de SMS",
      "Interface commune pour envoyer un SMS ou un code OTP. POST /envois { telephone, message }.");

    const paiement = { montant: 5000, telephone: "+22670123456", reference: "CMD-1" };
    const sms = { telephone: "+22670123456", message: "Votre code SystaBokk : 482913" };

    await upsertApi({
      slug: "montant-en-lettres", name: "Montant en lettres",
      description: "Écrit un montant en toutes lettres, en français, avec la phrase prête pour la facture.",
      category: "documents", countries: "BF,SN,CI,ML,NE,TG,BJ", owner: aminata,
      upstream: "internal:/demo-apis/montant-en-lettres", price: 4, path: "?montant=12500",
    });
    await upsertApi({
      slug: "telephone", name: "Validation de numéro",
      description: "Vérifie le format d'un numéro et le renvoie au format international (+226…).",
      category: "identite", countries: "BF,SN,CI,ML,NE,TG,BJ,GN,CM", owner: moussa,
      upstream: "internal:/demo-apis/telephone", price: 4, path: "?numero=70123456&pays=BF",
    });
    await upsertApi({
      slug: "devises", name: "Conversion FCFA ↔ euro",
      description: "Convertit entre FCFA (UEMOA, CEMAC) et euro à la parité fixe officielle.",
      category: "finance", countries: "BF,SN,CI,ML,NE,TG,BJ,CM,GA,CG,TD", owner: awa,
      upstream: "internal:/demo-apis/devises", price: 4, path: "?montant=100000&de=XOF&vers=EUR",
    });
    await upsertApi({
      slug: "qrcode", name: "Générateur de QR code",
      description: "Crée un QR code en SVG à partir d'un texte ou d'un lien : reçus, tickets, menus.",
      category: "outils", countries: "BF,SN,CI,ML,NE,TG,BJ,GN,CM", owner: aminata,
      upstream: "internal:/demo-apis/qrcode", price: 8, path: "?texte=https://systabokk.dev&taille=256",
    });
    await upsertApi({
      slug: "paiement-a", name: "Paiement mobile — Fournisseur A (test)",
      description: "Encaissement Mobile Money simulé. Fournisseur prioritaire de la prise « paiement-mobile ».",
      category: "paiement", countries: "BF,SN,CI", owner: aminata,
      upstream: "internal:/demo-apis/paiement/a", price: 20, prise: "paiement-mobile", priority: 1,
      method: "POST", path: "/paiements", body: paiement,
    });
    await upsertApi({
      slug: "paiement-b", name: "Paiement mobile — Fournisseur B (test)",
      description: "Encaissement Mobile Money simulé. Prend le relais si le fournisseur A tombe.",
      category: "paiement", countries: "BF,SN,CI", owner: moussa,
      upstream: "internal:/demo-apis/paiement/b", price: 20, prise: "paiement-mobile", priority: 2,
      method: "POST", path: "/paiements", body: paiement,
    });
    await upsertApi({
      slug: "sms-a", name: "SMS — Fournisseur A (test)",
      description: "Envoi de SMS et d'OTP simulé. Fournisseur prioritaire de la prise « sms ».",
      category: "messagerie", countries: "BF,SN,CI,ML", owner: awa,
      upstream: "internal:/demo-apis/sms/a", price: 12, prise: "sms", priority: 1,
      method: "POST", path: "/envois", body: sms,
    });
    await upsertApi({
      slug: "sms-b", name: "SMS — Fournisseur B (test)",
      description: "Envoi de SMS et d'OTP simulé. Prend le relais si le fournisseur A tombe.",
      category: "messagerie", countries: "BF,SN,CI,ML", owner: moussa,
      upstream: "internal:/demo-apis/sms/b", price: 12, prise: "sms", priority: 2,
      method: "POST", path: "/envois", body: sms,
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

  return { cleJury: k.key };
}
