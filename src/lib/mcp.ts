import { pool } from "@/db";
import { CATEGORIES } from "@/lib/categories";
import { baseInterne } from "@/lib/env";
import { handleApiCall, handlePriseCall } from "@/lib/gateway";
import type { DevSession } from "@/lib/session";

/**
 * Serveur MCP de SystaBokk : un agent IA (Claude, Cursor…) découvre les API du catalogue
 * et les APPELLE en payant à l'appel, en FCFA, avec la clé du développeur.
 * Transport « Streamable HTTP » sans état : chaque requête POST porte un message JSON-RPC 2.0.
 */

export const VERSIONS_PROTOCOLE = ["2025-06-18", "2025-03-26", "2024-11-05"];
const TAILLE_MAX_REPONSE = 8000;
const METHODES = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

type Json = Record<string, unknown>;
export type MessageRpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Json };

export const OUTILS = [
  {
    name: "rechercher_api",
    title: "Rechercher une API",
    description:
      "Cherche dans le catalogue SystaBokk des API africaines (paiement, SMS, identité, documents, devises, outils…). " +
      "Renvoie pour chaque API son identifiant, son prix par appel en FCFA, sa description et un exemple d'appel. " +
      "Gratuit : ne débite rien.",
    inputSchema: {
      type: "object",
      properties: {
        recherche: { type: "string", description: "Mots-clés, ex. « SMS », « facture », « numéro »." },
        categorie: { type: "string", enum: CATEGORIES.map((c) => c.slug), description: "Filtrer par catégorie." },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
  {
    name: "appeler_api",
    title: "Appeler une API (payant)",
    description:
      "Appelle une API du catalogue à travers la passerelle SystaBokk. L'appel est PAYANT : son prix en FCFA est débité " +
      "du portefeuille du développeur et reversé à 75 % au créateur (25 % de commission plateforme) de l'API. En cas d'échec du fournisseur, rien n'est débité. " +
      "Utilisez d'abord rechercher_api pour connaître l'identifiant, le prix et l'exemple d'appel.",
    inputSchema: {
      type: "object",
      properties: {
        api: { type: "string", description: "Identifiant de l'API, ex. « montant-en-lettres »." },
        methode: { type: "string", enum: METHODES, description: "Méthode HTTP (GET par défaut)." },
        chemin: { type: "string", description: "Chemin et paramètres après l'API, ex. « ?montant=12500 » ou « /envois »." },
        corps: { type: "object", description: "Corps JSON pour POST, PUT ou PATCH." },
      },
      required: ["api"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  {
    name: "appeler_prise",
    title: "Appeler une prise standard (payant, avec bascule)",
    description:
      "Appelle une prise standard (ex. « paiement-mobile », « sms ») : une même interface servie par plusieurs fournisseurs. " +
      "Si le premier fournisseur tombe, SystaBokk bascule automatiquement sur le suivant ; seul celui qui répond est payé.",
    inputSchema: {
      type: "object",
      properties: {
        prise: { type: "string", description: "Identifiant de la prise, ex. « sms »." },
        methode: { type: "string", enum: METHODES, description: "Méthode HTTP (POST par défaut)." },
        chemin: { type: "string", description: "Chemin, ex. « /envois » ou « /paiements »." },
        corps: { type: "object", description: "Corps JSON de la requête." },
      },
      required: ["prise"],
      additionalProperties: false,
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  },
  {
    name: "mon_solde",
    title: "Mon solde",
    description: "Donne le solde du portefeuille en FCFA, les gains comme créateur et les dépenses en appels. Gratuit.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false },
  },
];

const texte = (t: string, isError = false, structuredContent?: Json) => ({
  content: [{ type: "text", text: t }],
  ...(structuredContent ? { structuredContent } : {}),
  isError,
});

class ErreurParams extends Error {}

function chaine(v: unknown, nom: string, requis = false): string | undefined {
  if (v === undefined || v === null || v === "") {
    if (requis) throw new ErreurParams(`Paramètre « ${nom} » requis.`);
    return undefined;
  }
  if (typeof v !== "string") throw new ErreurParams(`« ${nom} » doit être une chaîne.`);
  return v.trim();
}

/** « /envois?x=1 » → segments ["envois"] et recherche « ?x=1 ». */
function decouperChemin(chemin: string | undefined) {
  const c = chemin ?? "";
  if (c && !/^[/?]/.test(c)) throw new ErreurParams("« chemin » doit commencer par « / » ou « ? ».");
  if (c.length > 500) throw new ErreurParams("« chemin » trop long.");
  const i = c.indexOf("?");
  const partie = i >= 0 ? c.slice(0, i) : c;
  const recherche = i >= 0 ? c.slice(i) : "";
  const segments = partie.split("/").filter(Boolean).map((s) => {
    try { return decodeURIComponent(s); } catch { return s; }
  });
  if (segments.some((s) => s === ".." || s === ".")) throw new ErreurParams("Chemin invalide.");
  return { segments, recherche };
}

/** Construit la requête interne puis passe par la vraie passerelle (même facturation). */
async function appelPasserelle(
  dev: DevSession,
  type: "api" | "prise",
  cible: string,
  args: Json,
  methodeParDefaut: "GET" | "POST",
) {
  const methode = (chaine(args.methode, "methode") ?? methodeParDefaut).toUpperCase();
  if (!(METHODES as readonly string[]).includes(methode)) throw new ErreurParams("Méthode non prise en charge.");
  const { segments, recherche } = decouperChemin(chaine(args.chemin, "chemin"));
  const corps = args.corps;
  if (corps !== undefined && (typeof corps !== "object" || corps === null || Array.isArray(corps))) {
    throw new ErreurParams("« corps » doit être un objet JSON.");
  }

  const url = `${baseInterne()}/v1/${type === "api" ? "apis" : "prises"}/${encodeURIComponent(cible)}` +
    (segments.length ? "/" + segments.map(encodeURIComponent).join("/") : "") + recherche;
  const avecCorps = corps !== undefined && methode !== "GET" && methode !== "DELETE";
  const req = new Request(url, {
    method: methode,
    headers: { authorization: `Bearer ${dev.cle}`, ...(avecCorps ? { "content-type": "application/json" } : {}) },
    body: avecCorps ? JSON.stringify(corps) : undefined,
  });

  const r = type === "api"
    ? await handleApiCall(req, cible, segments, "mcp")
    : await handlePriseCall(req, cible, segments, "mcp");

  const typeContenu = r.headers.get("content-type") ?? "";
  let corpsReponse: unknown = await r.text();
  if (typeContenu.includes("json")) {
    try { corpsReponse = JSON.parse(corpsReponse as string); } catch { /* texte brut */ }
  } else if ((corpsReponse as string).length > TAILLE_MAX_REPONSE) {
    corpsReponse = (corpsReponse as string).slice(0, TAILLE_MAX_REPONSE) + "\n… (tronqué)";
  }

  const resultat: Json = {
    statut_http: r.status,
    prix_fcfa: r.headers.get("x-systabokk-prix-fcfa") ? Number(r.headers.get("x-systabokk-prix-fcfa")) : 0,
    solde_fcfa: r.headers.get("x-systabokk-solde-fcfa") ? Number(r.headers.get("x-systabokk-solde-fcfa")) : null,
    ...(r.headers.get("x-systabokk-fournisseur") ? { fournisseur: r.headers.get("x-systabokk-fournisseur") } : {}),
    ...(r.headers.get("x-systabokk-bascule") && r.headers.get("x-systabokk-bascule") !== "non"
      ? { bascule_depuis: r.headers.get("x-systabokk-bascule") } : {}),
    type_contenu: typeContenu,
    reponse: corpsReponse,
  };
  const resume = r.ok
    ? `Appel réussi (HTTP ${r.status}) : ${resultat.prix_fcfa} FCFA débités, solde ${resultat.solde_fcfa ?? "?"} FCFA.` +
      (resultat.bascule_depuis ? ` Bascule automatique : ${resultat.bascule_depuis} était en panne, servi par ${resultat.fournisseur}.` : "")
    : `Échec (HTTP ${r.status}). Rien n'a été débité si le fournisseur était en cause.`;
  return texte(`${resume}\n\n${JSON.stringify(resultat, null, 2)}`, !r.ok, resultat);
}

async function rechercher(args: Json) {
  const recherche = chaine(args.recherche, "recherche");
  const categorie = chaine(args.categorie, "categorie");
  const { rows } = await pool.query<{
    slug: string; name: string; description: string; category: string; countries: string; price_fcfa: number;
    prise_slug: string | null; example_method: string; example_path: string; example_body: string | null;
  }>(
    `select slug, name, description, category, countries, price_fcfa, prise_slug, example_method, example_path, example_body
     from apis where is_active
       and ($1::text is null or category = $1)
       and ($2::text is null or name ilike '%' || $2 || '%' or description ilike '%' || $2 || '%' or category ilike '%' || $2 || '%')
     order by category, name limit 20`,
    [categorie ?? null, recherche ?? null],
  );
  const apis = rows.map((a) => ({
    api: a.slug,
    nom: a.name,
    categorie: a.category,
    pays: a.countries.split(","),
    prix_fcfa: a.price_fcfa,
    description: a.description,
    ...(a.prise_slug ? { prise: a.prise_slug } : {}),
    exemple: {
      outil: a.prise_slug ? "appeler_prise" : "appeler_api",
      ...(a.prise_slug ? { prise: a.prise_slug } : { api: a.slug }),
      methode: a.example_method,
      chemin: a.example_path,
      ...(a.example_body ? { corps: JSON.parse(a.example_body) } : {}),
    },
  }));
  const resume = apis.length
    ? `${apis.length} API trouvée(s). Prix par appel en FCFA, débité seulement en cas de succès.`
    : "Aucune API ne correspond. Essayez sans filtre.";
  return texte(`${resume}\n\n${JSON.stringify(apis, null, 2)}`, false, { apis });
}

async function solde(dev: DevSession) {
  const { rows } = await pool.query<{ n: string; total: string }>(
    "select count(*) as n, coalesce(sum(price_fcfa), 0) as total from calls where consumer_dev_id = $1 and billed",
    [dev.id],
  );
  const r = {
    developpeur: dev.name,
    solde_fcfa: dev.balance,
    gains_createur_fcfa: dev.earned,
    appels_payes: Number(rows[0].n),
    depenses_fcfa: Number(rows[0].total),
  };
  return texte(`Solde : ${r.solde_fcfa} FCFA.\n\n${JSON.stringify(r, null, 2)}`, false, r);
}

/** Traite un message JSON-RPC. Renvoie null pour une notification (pas de réponse). */
export async function traiterMessage(dev: DevSession, m: MessageRpc): Promise<Json | null> {
  const id = m.id ?? null;
  const estNotification = m.id === undefined;
  const ok = (result: Json) => ({ jsonrpc: "2.0", id, result });
  const ko = (code: number, message: string) => ({ jsonrpc: "2.0", id, error: { code, message } });

  if (m.jsonrpc !== "2.0" || typeof m.method !== "string") return estNotification ? null : ko(-32600, "Requête JSON-RPC invalide.");
  if (estNotification) return null; // notifications/initialized, notifications/cancelled…

  const p = (m.params ?? {}) as Json;
  try {
    switch (m.method) {
      case "initialize": {
        const demandee = typeof p.protocolVersion === "string" ? p.protocolVersion : "";
        return ok({
          protocolVersion: VERSIONS_PROTOCOLE.includes(demandee) ? demandee : VERSIONS_PROTOCOLE[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: "systabokk", title: "SystaBokk — la bourse des API africaines", version: "1.0.0" },
          instructions:
            "SystaBokk donne accès à des API africaines payées à l'appel en FCFA. Cherchez avec rechercher_api, " +
            "puis appelez avec appeler_api ou appeler_prise. Chaque appel réussi est débité du portefeuille ; " +
            "annoncez le prix à l'utilisateur avant d'appeler une API coûteuse.",
        });
      }
      case "ping":
        return ok({});
      case "tools/list":
        return ok({ tools: OUTILS });
      case "tools/call": {
        const nom = p.name;
        const args = (p.arguments ?? {}) as Json;
        switch (nom) {
          case "rechercher_api": return ok(await rechercher(args));
          case "appeler_api": return ok(await appelPasserelle(dev, "api", chaine(args.api, "api", true)!, args, "GET"));
          case "appeler_prise": return ok(await appelPasserelle(dev, "prise", chaine(args.prise, "prise", true)!, args, "POST"));
          case "mon_solde": return ok(await solde(dev));
          default: return ko(-32602, `Outil inconnu : ${String(nom)}`);
        }
      }
      default:
        return ko(-32601, `Méthode non prise en charge : ${m.method}`);
    }
  } catch (e) {
    if (e instanceof ErreurParams) return ok(texte(e.message, true));
    console.error("[mcp]", e);
    return ko(-32603, "Erreur interne.");
  }
}
