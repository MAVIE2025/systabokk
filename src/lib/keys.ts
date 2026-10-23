import { createHash, randomBytes } from "node:crypto";

const PREFIX = "sbk_live_";

/** Génère une clé d'API. Elle n'est montrée qu'une fois : seul son hash est stocké. */
export function generateApiKey() {
  const key = PREFIX + randomBytes(24).toString("base64url");
  return { key, hash: hashApiKey(key), prefix: key.slice(0, PREFIX.length + 4) };
}

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

/** Lit la clé dans « Authorization: Bearer … » ou « X-Api-Key ». */
export function readApiKey(headers: Headers): string | null {
  const auth = headers.get("authorization");
  if (auth?.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return headers.get("x-api-key")?.trim() || null;
}
