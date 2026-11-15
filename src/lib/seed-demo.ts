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
         example_body = excluded.example_body`,
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

    // Forum : quelques sujets de démonstration (insérés une seule fois, jamais écrasés)
    const issa = await upsertDev("Issa (démo)", "issa@demo.systabokk.dev", "CI");
    const koffi = await upsertDev("Koffi (démo)", "koffi@demo.systabokk.dev", "TG");
    const sujetDemo = async (id: string, auteur: string, type: string, titre: string, corps: string, categorie: string | null,
      creeIlYa: string, relanceIlYa: string, nbRelances = 0) => {
      await pool.query(
        `insert into forum_sujets (id, auteur_dev_id, type, titre, corps, categorie, nb_relances, created_at, relance_at)
         values ($1, $2, $3, $4, $5, $6, $7, now() - $8::interval, now() - $9::interval) on conflict (id) do nothing`,
        [id, auteur, type, titre, corps, categorie, nbRelances, creeIlYa, relanceIlYa],
      );
    };
    const reponseDemo = async (id: string, sujet: string, auteur: string, corps: string, ilYa: string, api: string | null = null) => {
      await pool.query(
        `insert into forum_reponses (id, sujet_id, auteur_dev_id, corps, api_slug, created_at)
         values ($1, $2, $3, $4, $5, now() - $6::interval) on conflict (id) do nothing`,
        [id, sujet, auteur, corps, api, ilYa],
      );
    };
    const valider = async (sujet: string, reponse: string, ilYa: string) => {
      await pool.query(
        `update forum_sujets set statut = 'resolu', reponse_validee_id = $2, resolu_at = now() - $3::interval
         where id = $1 and reponse_validee_id is null and statut = 'ouvert'`,
        [sujet, reponse, ilYa],
      );
    };
    const { rows: dejaForum } = await pool.query("select 1 from forum_sujets where id = 'f0000000-0000-4000-8000-000000000001'");
    if (!dejaForum.length) {
      const S = (n: number) => `f0000000-0000-4000-8000-00000000000${n}`;
      const R = (n: number) => `f1000000-0000-4000-8000-00000000000${n}`;
      await sujetDemo(S(1), issa, "recherche_api", "Je cherche une API pour écrire les montants en lettres sur mes factures",
        "Mes clients au Burkina exigent le montant en toutes lettres sur chaque facture (« Arrêtée la présente facture à la somme de… »). Je ne veux pas recoder ça en PHP. Une API existe ?",
        "documents", "4 days", "4 days");
      await reponseDemo(R(1), S(1), aminata, "Je l'ai publiée sur SystaBokk : 4 FCFA par appel, elle renvoie aussi la phrase prête pour la facture. Exemple : ?montant=12500 → « douze mille cinq cents ».", "3 days", "montant-en-lettres");
      await valider(S(1), R(1), "3 days");

      await sujetDemo(S(2), issa, "question", "Webhook Mobile Money reçu deux fois : comment éviter de livrer deux fois ?",
        "Mon fournisseur renvoie parfois la même notification de paiement. Résultat : la commande est validée deux fois. Comment vous gérez ça ?",
        "paiement", "6 days", "6 days");
      await reponseDemo(R(2), S(2), moussa, "Classique. Garde la référence de transaction avec une contrainte unique en base : la 2e insertion échoue, tu réponds 200 sans rien refaire. Et vérifie toujours la signature du webhook.", "5 days");
      await valider(S(2), R(2), "5 days");

      await sujetDemo(S(3), koffi, "recherche_api", "API de vérification de numéro IFU au Burkina ?",
        "Pour mon appli de facturation, je dois vérifier que l'IFU d'un client existe avant d'émettre la facture. Quelqu'un a ça ?",
        "identite", "6 days", "6 days");
      await reponseDemo(R(3), S(3), awa, "Pas encore au catalogue. Je peux la coder et la publier cette semaine si tu es preneur : tu serais le premier client.", "5 days");

      await sujetDemo(S(4), awa, "question", "Next.js sur une instance de 512 Mo : le build plante",
        "Sur l'offre gratuite, mon build Next.js s'arrête sans message. En local tout marche. Des idées ?",
        "outils", "11 days", "11 days");
      await reponseDemo(R(4), S(4), moussa, "Construis l'image avec output: 'standalone' et fais le build ailleurs (CI), puis ne déploie que le résultat : le serveur n'a plus besoin de 1 Go pour compiler.", "10 days");

      await sujetDemo(S(5), koffi, "question", "Comment tester un paiement Mobile Money sans compte marchand ?",
        "Je n'ai pas encore de compte marchand et je veux montrer mon tunnel de paiement à un client demain.",
        "paiement", "5 hours", "5 hours");
      await reponseDemo(R(5), S(5), moussa, "La prise standard « Paiement mobile » de SystaBokk a deux fournisseurs de test : même interface que la prod, et tu peux simuler une panne pour voir la bascule.", "3 hours", "paiement-a");

      await sujetDemo(S(6), awa, "question", "Envoyer des SMS au Mali : quel fournisseur est fiable ?",
        "J'ai eu beaucoup d'échecs de livraison vers les numéros maliens le mois dernier. Vous utilisez quoi ?",
        "messagerie", "12 days", "1 day", 1);
      await reponseDemo(R(6), S(6), issa, "Passe par la prise SMS : si le fournisseur A n'arrive pas à livrer, SystaBokk bascule sur B et tu ne paies que celui qui a servi.", "20 hours", "sms-a");
    }

  return { cleJury: k.key };
}
