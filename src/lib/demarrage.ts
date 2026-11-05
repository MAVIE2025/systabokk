import path from "node:path";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db, pool } from "@/db";
import { seedDemo } from "@/lib/seed-demo";

const attendre = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
      console.error(`[démarrage] essai ${essai}/20 :`, e instanceof Error ? e.message : e);
      await attendre(3000);
    }
  }
  console.error("[démarrage] ÉCHEC : la base est injoignable, l'appli démarre sans migration.");
}
