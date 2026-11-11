"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { pool } from "@/db";
import { generateApiKey } from "@/lib/keys";
import { CATEGORIES, PAYS_PUBLICATION } from "@/lib/categories";
import { devConnecte, devParCle, effacerCle, poserCle } from "@/lib/session";
import { verifierFormeUrl, verifierUrlPublique } from "@/lib/url-sure";
import { pannes } from "@/lib/demo/pannes";
import { baseInterne } from "@/lib/env";
import { handleApiCall, handlePriseCall } from "@/lib/gateway";

const CREDIT_BIENVENUE = 1000; // FCFA fictifs offerts à l'inscription (mode test)
const RECHARGE_TEST = 2000;
const PLAFOND_RECHARGES_TEST = 20000;

export type EtatFormulaire = { erreur?: string; erreurs?: Record<string, string>; cle?: string; slug?: string };

/* ---------- Inscription et connexion ---------- */

const schemaInscription = z.object({
  name: z.string().trim().min(2, "Votre nom (2 caractères au moins).").max(60),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(120),
  country: z.enum(PAYS_PUBLICATION, { message: "Choisissez votre pays." }),
});

export async function inscrire(_: EtatFormulaire, form: FormData): Promise<EtatFormulaire> {
  const p = schemaInscription.safeParse(Object.fromEntries(form));
  if (!p.success) return { erreur: p.error.issues[0].message };

  const client = await pool.connect();
  const k = generateApiKey();
  try {
    await client.query("begin");
    const existe = await client.query("select 1 from devs where email = $1", [p.data.email]);
    if (existe.rowCount) {
      await client.query("rollback");
      return { erreur: "Cette adresse a déjà un compte. Connectez-vous avec votre clé." };
    }
    const { rows } = await client.query<{ id: string }>(
      "insert into devs (name, email, country) values ($1, $2, $3) returning id",
      [p.data.name, p.data.email, p.data.country],
    );
    const id = rows[0].id;
    await client.query("insert into wallets (dev_id, balance_fcfa) values ($1, $2)", [id, CREDIT_BIENVENUE]);
    await client.query(
      "insert into ledger (dev_id, amount_fcfa, kind, note) values ($1, $2, 'recharge', 'crédit de bienvenue (test)')",
      [id, CREDIT_BIENVENUE],
    );
    await client.query("insert into api_keys (dev_id, key_hash, prefix) values ($1, $2, $3)", [id, k.hash, k.prefix]);
    await client.query("commit");
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
  await poserCle(k.key);
  return { cle: k.key };
}

export async function connecter(_: EtatFormulaire, form: FormData): Promise<EtatFormulaire> {
  const cle = String(form.get("cle") ?? "").trim();
  if (!cle.startsWith("sbk_") || !(await devParCle(cle))) return { erreur: "Clé inconnue ou révoquée." };
  await poserCle(cle);
  redirect("/espace");
}

export async function deconnecter() {
  await effacerCle();
  redirect("/");
}

export async function entrerJury() {
  const cle = process.env.PASS_JURY_KEY;
  if (!cle || !(await devParCle(cle))) redirect("/jury?indisponible=1");
  await poserCle(cle);
  redirect("/jury");
}

/** Recharge de TEST (Mobile Money simulé), plafonnée. */
export async function rechargerTest() {
  const dev = await devConnecte();
  if (!dev) redirect("/espace");
  const { rows } = await pool.query<{ total: string }>(
    "select coalesce(sum(amount_fcfa), 0) as total from ledger where dev_id = $1 and kind = 'recharge'",
    [dev.id],
  );
  if (Number(rows[0].total) + RECHARGE_TEST <= PLAFOND_RECHARGES_TEST + CREDIT_BIENVENUE) {
    await pool.query("update wallets set balance_fcfa = balance_fcfa + $2 where dev_id = $1", [dev.id, RECHARGE_TEST]);
    await pool.query(
      "insert into ledger (dev_id, amount_fcfa, kind, note) values ($1, $2, 'recharge', 'Mobile Money simulé (test)')",
      [dev.id, RECHARGE_TEST],
    );
  }
  revalidatePath("/espace");
}

/* ---------- Publication d'une API ---------- */

const schemaApi = z.object({
  name: z.string().trim().min(3, "Nom : 3 caractères au moins.").max(60),
  description: z.string().trim().min(10, "Description : 10 caractères au moins.").max(300),
  category: z.enum(CATEGORIES.map((c) => c.slug) as [string, ...string[]], { message: "Choisissez une catégorie." }),
  countries: z.array(z.enum(PAYS_PUBLICATION)).min(1, "Choisissez au moins un pays."),
  upstreamUrl: z.string().trim().min(1, "Adresse de votre API requise.").max(300),
  priceFcfa: z.coerce.number().int("Prix entier en FCFA.").min(1, "Prix : 1 FCFA au moins.").max(100000),
  docUrl: z.string().trim().max(300).optional().or(z.literal("")),
  exampleMethod: z.enum(["GET", "POST"]).default("GET"),
  examplePath: z.string().trim().max(200).regex(/^([?/].*)?$/, "L'exemple commence par « ? » ou « / ».").default(""),
  exampleBody: z.string().trim().max(2000).optional().or(z.literal("")),
  priseSlug: z.string().trim().optional().or(z.literal("")),
});

function slugifier(nom: string) {
  return (
    nom.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "api"
  );
}

export async function publierApi(_: EtatFormulaire, form: FormData): Promise<EtatFormulaire> {
  const dev = await devConnecte();
  if (!dev) return { erreur: "Connectez-vous d'abord avec votre clé." };
  if (dev.estJury) return { erreur: "Le Pass Jury sert à essayer, pas à publier." };

  const brut = { ...Object.fromEntries(form), countries: form.getAll("countries") };
  const p = schemaApi.safeParse(brut);
  if (!p.success) return { erreur: p.error.issues[0].message };
  const d = p.data;

  const url = await verifierUrlPublique(d.upstreamUrl);
  if (!url.ok) return { erreur: `Adresse de l'API : ${url.raison}` };
  if (d.docUrl) {
    const doc = verifierFormeUrl(d.docUrl);
    if (!doc.ok) return { erreur: `Documentation : ${doc.raison}` };
  }
  if (d.exampleBody) {
    try {
      JSON.parse(d.exampleBody);
    } catch {
      return { erreur: "Le corps d'exemple doit être du JSON valide." };
    }
  }
  if (d.priseSlug) {
    const pr = await pool.query("select 1 from prises where slug = $1", [d.priseSlug]);
    if (!pr.rowCount) return { erreur: "Prise standard inconnue." };
  }

  // Slug unique : « mon-api », puis « mon-api-2 »…
  const base = slugifier(d.name);
  let slug = base;
  for (let i = 2; (await pool.query("select 1 from apis where slug = $1", [slug])).rowCount; i++) slug = `${base}-${i}`;

  await pool.query(
    `insert into apis (slug, name, description, category, countries, owner_dev_id, upstream_url, price_fcfa,
                       prise_slug, doc_url, example_method, example_path, example_body)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [slug, d.name, d.description, d.category, d.countries.join(","), dev.id, url.url.toString().replace(/\/+$/, ""),
     d.priceFcfa, d.priseSlug || null, d.docUrl || null, d.exampleMethod, d.examplePath, d.exampleBody || null],
  );
  revalidatePath("/catalogue");
  revalidatePath("/espace");
  return { slug };
}

/* ---------- Essai depuis la fiche (vrai appel payant via la passerelle) ---------- */

export type ResultatEssai = {
  erreur?: string;
  status?: number;
  contentType?: string;
  corps?: string;
  prix?: string | null;
  solde?: string | null;
  fournisseur?: string | null;
  bascule?: string | null;
  url?: string;
};

export async function essayerApi(slug: string): Promise<ResultatEssai> {
  const dev = await devConnecte();
  if (!dev) return { erreur: "connexion" };

  const { rows } = await pool.query<{
    prise_slug: string | null; example_method: string; example_path: string; example_body: string | null;
  }>("select prise_slug, example_method, example_path, example_body from apis where slug = $1 and is_active", [slug]);
  const a = rows[0];
  if (!a) return { erreur: "API introuvable." };

  const chemin = (a.prise_slug ? `/v1/prises/${a.prise_slug}` : `/v1/apis/${slug}`) + a.example_path;
  const avecCorps = a.example_method !== "GET" && !!a.example_body;
  const req = new Request(baseInterne() + chemin, {
    method: a.example_method,
    headers: { authorization: `Bearer ${dev.cle}`, ...(avecCorps ? { "content-type": "application/json" } : {}) },
    body: avecCorps ? a.example_body! : undefined,
  });
  const i = a.example_path.indexOf("?");
  const segments = (i >= 0 ? a.example_path.slice(0, i) : a.example_path).split("/").filter(Boolean);
  const r = a.prise_slug
    ? await handlePriseCall(req, a.prise_slug, segments, "site")
    : await handleApiCall(req, slug, segments, "site");
  const contentType = r.headers.get("content-type") ?? "";
  const texte = await r.text();
  revalidatePath("/espace");
  return {
    status: r.status,
    contentType,
    corps: texte.length > 6000 ? texte.slice(0, 6000) + "\n…" : texte,
    prix: r.headers.get("x-systabokk-prix-fcfa"),
    solde: r.headers.get("x-systabokk-solde-fcfa"),
    fournisseur: r.headers.get("x-systabokk-fournisseur"),
    bascule: r.headers.get("x-systabokk-bascule"),
    url: `${a.example_method} ${chemin}`,
  };
}

/* ---------- Démo : panne simulée (réservée au Pass Jury) ---------- */

const PANNES_DEMO = ["paiement-a", "sms-a"] as const;

export async function basculerPanneDemo(cle: string) {
  const dev = await devConnecte();
  if (!dev?.estJury || !(PANNES_DEMO as readonly string[]).includes(cle)) return;
  if (pannes.has(cle)) pannes.delete(cle);
  else pannes.add(cle);
  revalidatePath("/jury");
}
