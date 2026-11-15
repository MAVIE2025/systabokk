import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { optionsPg } from "./options";

// Une seule connexion partagée, même après rechargement à chaud en développement
const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool =
  globalForDb.pool ??
  new Pool({ ...optionsPg(), idleTimeoutMillis: 20_000, keepAlive: true });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

// Une connexion inactive coupée par le réseau ne doit jamais faire planter le serveur :
// sans cet écouteur, Node.js s'arrête sur l'événement « error » du pool.
if (pool.listenerCount("error") === 0) {
  pool.on("error", (e) => console.error("[base] connexion inactive perdue :", e.message));
}

export const db = drizzle(pool, { schema });
export { schema };
