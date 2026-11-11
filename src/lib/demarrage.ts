import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "@/db";
import { seedDemo } from "@/lib/seed-demo";

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Remonte à la vraie cause (Drizzle enveloppe l'erreur PostgreSQL) et donne une piste en français. */
function expliquer(e: unknown): string {
  let err = e as { message?: string; code?: string; cause?: unknown } | undefined;
  while (err?.cause) err = err.cause as typeof err;
  const msg = err?.message ?? String(e);
  const code = err?.code ?? "";
  const pistes: Record<string, string> = {
    "28P01": "mot de passe ou utilisateur refusé : vérifiez DATABASE_URL",
    "08P01": "la base exige le SSL : ajoutez DATABASE_SSL=require",
    "28000": "utilisateur refusé : vérifiez le nom d'utilisateur dans DATABASE_URL",
    ERR_INVALID_URL: "DATABASE_URL mal formée (port non numérique ou caractère spécial dans le mot de passe) : utilisez plutôt PGHOST, PGPORT, PGUSER, PGPASSWORD et PGDATABASE",
    "3D000": "base de données inconnue : vérifiez le nom après le dernier « / »",
    ENOTFOUND: "nom d'hôte introuvable : vérifiez l'hôte dans DATABASE_URL",
    ECONNREFUSED: "connexion refusée : vérifiez le port, ou la base est arrêtée",
    ETIMEDOUT: "délai dépassé : port ou réseau bloqué",
    ECONNRESET: "connexion coupée : essayez DATABASE_SSL=require",
  };
  if (!process.env.DATABASE_URL && !process.env.PGHOST) return "ni DATABASE_URL ni PGHOST ne sont définies";
  return pistes[code] ? `${msg} (${code}) — ${pistes[code]}` : `${msg}${code ? ` (${code})` : ""}`;
}

/**
 * Au démarrage : applique les migrations, puis charge les données de démo (sauf SEED_DEMO=0).
 * Utile sur un hébergement sans accès console (Web service Systalink).
 * Réessaie pendant ~1 min si la base n'est pas encore joignable.
 */
export async function demarrage() {
  for (let essai = 1; essai <= 20; essai++) {
    try {
      await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
      console.log("[démarrage] migrations appliquées");
      if (process.env.SEED_DEMO !== "0") {
        const { cleJury } = await seedDemo(pool);
        console.log("[démarrage] données de démo prêtes");
        if (!process.env.PASS_JURY_KEY) {
          console.warn(`[démarrage] PASS_JURY_KEY absente : clé Pass Jury générée ${cleJury.slice(0, 13)}…`);
        }
      }
      return;
    } catch (e) {
      console.error(`[démarrage] essai ${essai}/20 : ${expliquer(e)}`);
      await attendre(3000);
    }
  }
  console.error("[démarrage] ÉCHEC : la base est injoignable, l'appli démarre sans migration.");
}
