import { randomUUID } from "node:crypto";
import { pool } from "@/db";
import { hashApiKey, readApiKey } from "@/lib/keys";
import { hotePublic } from "@/lib/url-sure";
import { baseInterne } from "@/lib/env";

/** Une API telle que la passerelle en a besoin. */
type ApiRow = {
  id: string;
  slug: string;
  owner_dev_id: string;
  upstream_url: string;
  price_fcfa: number;
};

const UPSTREAM_TIMEOUT_MS = 10_000;

// En-têtes du client qu'on ne transmet jamais au fournisseur
const DROP_REQUEST_HEADERS = new Set([
  "authorization",
  "x-api-key",
  "host",
  "cookie",
  "connection",
  "content-length",
  "accept-encoding",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
]);

// En-têtes de réponse que fetch a déjà traités
const DROP_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
  "set-cookie",
]);

function creatorSharePercent() {
  const n = Number(process.env.CREATOR_SHARE_PERCENT ?? 90);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : 90;
}

/** Répartit un prix entre créateur et plateforme. Le créateur est arrondi à l'inférieur. */
export function splitPrice(priceFcfa: number) {
  const creator = Math.floor((priceFcfa * creatorSharePercent()) / 100);
  return { creator, commission: priceFcfa - creator };
}

function json(status: number, body: unknown, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extra },
  });
}

/** Retrouve le dev à partir de sa clé ; null si clé absente, inconnue ou révoquée. */
async function authenticate(req: Request): Promise<string | null> {
  const key = readApiKey(req.headers);
  if (!key) return null;
  const { rows } = await pool.query<{ dev_id: string }>(
    "select dev_id from api_keys where key_hash = $1 and revoked_at is null",
    [hashApiKey(key)],
  );
  return rows[0]?.dev_id ?? null;
}

/**
 * Réserve le prix sur le portefeuille, de façon atomique :
 * le débit n'a lieu que si le solde suffit, donc jamais de solde négatif.
 */
async function reserve(devId: string, priceFcfa: number): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const res = await client.query(
      "update wallets set balance_fcfa = balance_fcfa - $2 where dev_id = $1 and balance_fcfa >= $2",
      [devId, priceFcfa],
    );
    if (res.rowCount !== 1) {
      await client.query("rollback");
      return false;
    }
    await client.query(
      "insert into ledger (dev_id, amount_fcfa, kind, note) values ($1, $2, 'reservation', 'appel en cours')",
      [devId, -priceFcfa],
    );
    await client.query("commit");
    return true;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Clôture un appel en une seule transaction :
 * - succès : on journalise, le créateur reçoit sa part, la plateforme sa commission ;
 * - échec du fournisseur : on rembourse le consommateur.
 */
async function settle(opts: {
  api: ApiRow;
  consumerDevId: string;
  viaPrise: string | null;
  status: number;
  latencyMs: number;
  billed: boolean;
}): Promise<number> {
  const { api, consumerDevId, viaPrise, status, latencyMs, billed } = opts;
  const client = await pool.connect();
  try {
    await client.query("begin");
    const { rows } = await client.query<{ id: number }>(
      `insert into calls (api_id, consumer_dev_id, via_prise, status, latency_ms, price_fcfa, billed)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [api.id, consumerDevId, viaPrise, status, latencyMs, billed ? api.price_fcfa : 0, billed],
    );
    const callId = rows[0].id;

    if (billed) {
      const { creator, commission } = splitPrice(api.price_fcfa);
      await client.query(
        "update wallets set balance_fcfa = balance_fcfa + $2, earned_fcfa = earned_fcfa + $2 where dev_id = $1",
        [api.owner_dev_id, creator],
      );
      await client.query(
        "insert into ledger (dev_id, amount_fcfa, kind, call_id) values ($1, $2, 'revenu', $3)",
        [api.owner_dev_id, creator, callId],
      );
      await client.query(
        "insert into ledger (dev_id, amount_fcfa, kind, call_id) values (null, $1, 'commission', $2)",
        [commission, callId],
      );
    } else {
      await client.query(
        "update wallets set balance_fcfa = balance_fcfa + $2 where dev_id = $1",
        [consumerDevId, api.price_fcfa],
      );
      await client.query(
        "insert into ledger (dev_id, amount_fcfa, kind, call_id, note) values ($1, $2, 'remboursement', $3, 'échec du fournisseur')",
        [consumerDevId, api.price_fcfa, callId],
      );
    }
    await client.query("commit");
    return callId;
  } catch (e) {
    await client.query("rollback");
    throw e;
  } finally {
    client.release();
  }
}

async function balanceOf(devId: string): Promise<number> {
  const { rows } = await pool.query<{ balance_fcfa: number }>(
    "select balance_fcfa from wallets where dev_id = $1",
    [devId],
  );
  return rows[0]?.balance_fcfa ?? 0;
}

/** « internal:/demo-apis/… » désigne une API de démo servie par l'appli elle-même. */
function resolveUpstream(upstreamUrl: string, subPath: string[], search: string) {
  const base = upstreamUrl.startsWith("internal:")
    ? baseInterne() + upstreamUrl.slice("internal:".length)
    : upstreamUrl;
  const path = subPath.map(encodeURIComponent).join("/");
  return base.replace(/\/+$/, "") + (path ? "/" + path : "") + search;
}

type UpstreamResult =
  | { ok: true; response: Response; status: number; latencyMs: number }
  | { ok: false; status: number; latencyMs: number };

/** Relaie la requête au fournisseur. Une erreur réseau ou un 5xx compte comme un échec. */
async function forward(
  req: Request,
  body: ArrayBuffer | null,
  target: string,
  requestId: string,
  externe: boolean,
): Promise<UpstreamResult> {
  // Protection SSRF : une API externe ne doit jamais viser une adresse interne
  if (externe && !(await hotePublic(new URL(target).hostname))) {
    return { ok: false, status: 502, latencyMs: 0 };
  }
  const headers = new Headers();
  req.headers.forEach((value, name) => {
    if (!DROP_REQUEST_HEADERS.has(name.toLowerCase())) headers.set(name, value);
  });
  headers.set("x-systabokk-request-id", requestId);

  const started = Date.now();
  try {
    const response = await fetch(target, {
      method: req.method,
      headers,
      body: body && body.byteLength > 0 ? body : undefined,
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    const latencyMs = Date.now() - started;
    if (response.status >= 500) {
      await response.body?.cancel();
      return { ok: false, status: response.status, latencyMs };
    }
    return { ok: true, response, status: response.status, latencyMs };
  } catch (e) {
    const cause = e instanceof Error ? ((e.cause as { code?: string })?.code ?? e.name) : String(e);
    console.warn(`[passerelle] ${requestId} échec réseau vers ${new URL(target).host} : ${cause}`);
    return { ok: false, status: 502, latencyMs: Date.now() - started };
  }
}

async function buildResponse(upstream: Response, extra: Record<string, string>) {
  const headers = new Headers();
  upstream.headers.forEach((value, name) => {
    if (!DROP_RESPONSE_HEADERS.has(name.toLowerCase())) headers.set(name, value);
  });
  for (const [k, v] of Object.entries(extra)) headers.set(k, v);
  return new Response(await upstream.arrayBuffer(), { status: upstream.status, headers });
}

async function readBody(req: Request) {
  return req.method === "GET" || req.method === "HEAD" ? null : await req.arrayBuffer();
}

const NO_KEY = () =>
  json(401, { erreur: "cle_invalide", message: "Clé d'API absente, inconnue ou révoquée." });
const NO_FUNDS = (price: number) =>
  json(402, {
    erreur: "solde_insuffisant",
    message: `Solde insuffisant : cet appel coûte ${price} FCFA. Rechargez votre portefeuille.`,
  });

/** Appel direct d'une API : /v1/apis/{slug}/… */
export async function handleApiCall(req: Request, slug: string, subPath: string[]) {
  const consumer = await authenticate(req);
  if (!consumer) return NO_KEY();

  const { rows } = await pool.query<ApiRow>(
    "select id, slug, owner_dev_id, upstream_url, price_fcfa from apis where slug = $1 and is_active",
    [slug],
  );
  const api = rows[0];
  if (!api) return json(404, { erreur: "api_inconnue", message: `Aucune API active « ${slug} ».` });

  if (!(await reserve(consumer, api.price_fcfa))) return NO_FUNDS(api.price_fcfa);

  const requestId = randomUUID();
  const body = await readBody(req);
  const target = resolveUpstream(api.upstream_url, subPath, new URL(req.url).search);
  const result = await forward(req, body, target, requestId, !api.upstream_url.startsWith("internal:"));

  await settle({
    api,
    consumerDevId: consumer,
    viaPrise: null,
    status: result.status,
    latencyMs: result.latencyMs,
    billed: result.ok,
  });

  if (!result.ok) {
    return json(502, {
      erreur: "fournisseur_indisponible",
      message: "Le fournisseur n'a pas répondu correctement. Vous n'avez pas été débité.",
      requestId,
    });
  }
  return buildResponse(result.response, {
    "x-systabokk-request-id": requestId,
    "x-systabokk-api": api.slug,
    "x-systabokk-prix-fcfa": String(api.price_fcfa),
    "x-systabokk-solde-fcfa": String(await balanceOf(consumer)),
  });
}

/**
 * Appel via une prise standard : /v1/prises/{prise}/…
 * Les fournisseurs sont essayés par ordre de priorité ; si l'un tombe, on bascule
 * sur le suivant. Seul le fournisseur qui a répondu est facturé.
 */
export async function handlePriseCall(req: Request, priseSlug: string, subPath: string[]) {
  const consumer = await authenticate(req);
  if (!consumer) return NO_KEY();

  const { rows: providers } = await pool.query<ApiRow>(
    `select id, slug, owner_dev_id, upstream_url, price_fcfa from apis
     where prise_slug = $1 and is_active order by prise_priority asc, price_fcfa asc`,
    [priseSlug],
  );
  if (providers.length === 0) {
    return json(404, { erreur: "prise_inconnue", message: `Aucun fournisseur pour la prise « ${priseSlug} ».` });
  }

  const requestId = randomUUID();
  const body = await readBody(req);
  const search = new URL(req.url).search;
  const tried: string[] = [];

  for (const api of providers) {
    if (!(await reserve(consumer, api.price_fcfa))) return NO_FUNDS(api.price_fcfa);

    const result = await forward(
      req, body, resolveUpstream(api.upstream_url, subPath, search), requestId, !api.upstream_url.startsWith("internal:"),
    );
    await settle({
      api,
      consumerDevId: consumer,
      viaPrise: priseSlug,
      status: result.status,
      latencyMs: result.latencyMs,
      billed: result.ok,
    });
    tried.push(api.slug);

    if (result.ok) {
      return buildResponse(result.response, {
        "x-systabokk-request-id": requestId,
        "x-systabokk-prise": priseSlug,
        "x-systabokk-fournisseur": api.slug,
        "x-systabokk-bascule": tried.length > 1 ? tried.slice(0, -1).join(",") : "non",
        "x-systabokk-prix-fcfa": String(api.price_fcfa),
        "x-systabokk-solde-fcfa": String(await balanceOf(consumer)),
      });
    }
  }

  return json(503, {
    erreur: "tous_fournisseurs_indisponibles",
    message: "Aucun fournisseur de cette prise n'a répondu. Vous n'avez pas été débité.",
    essayes: tried,
    requestId,
  });
}
