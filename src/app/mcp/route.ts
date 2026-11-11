import { readApiKey } from "@/lib/keys";
import { devParCle } from "@/lib/session";
import { traiterMessage, type MessageRpc } from "@/lib/mcp";

export const dynamic = "force-dynamic";

const json = (status: number, corps: unknown) =>
  new Response(JSON.stringify(corps), { status, headers: { "content-type": "application/json; charset=utf-8" } });

/** Point d'entrée MCP (Streamable HTTP, sans état). Authentification : la clé SystaBokk du développeur. */
export async function POST(req: Request) {
  const cle = readApiKey(req.headers);
  const dev = cle ? await devParCle(cle) : null;
  if (!dev) {
    return json(401, {
      jsonrpc: "2.0",
      id: null,
      error: { code: -32001, message: "Clé SystaBokk requise : en-tête « Authorization: Bearer sbk_live_… »." },
    });
  }

  let corps: unknown;
  try {
    corps = await req.json();
  } catch {
    return json(400, { jsonrpc: "2.0", id: null, error: { code: -32700, message: "JSON invalide." } });
  }

  const messages = (Array.isArray(corps) ? corps : [corps]) as MessageRpc[];
  if (messages.length === 0 || messages.length > 20) {
    return json(400, { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Lot vide ou trop grand." } });
  }

  const reponses = [];
  for (const m of messages) {
    const r = await traiterMessage(dev, m && typeof m === "object" ? m : {});
    if (r) reponses.push(r);
  }
  // Uniquement des notifications : accusé de réception sans contenu
  if (reponses.length === 0) return new Response(null, { status: 202 });
  return json(200, Array.isArray(corps) ? reponses : reponses[0]);
}

/** Pas de flux serveur → client (SSE) dans ce serveur sans état. */
export function GET() {
  return new Response("Utilisez POST pour parler au serveur MCP SystaBokk.", { status: 405, headers: { allow: "POST" } });
}

export function DELETE() {
  return new Response(null, { status: 405, headers: { allow: "POST" } });
}
