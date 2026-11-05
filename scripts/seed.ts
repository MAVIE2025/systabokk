/**
 * Charge les données de démo (voir src/lib/seed-demo.ts).
 *   npm run db:seed
 * Elles sont aussi chargées automatiquement au démarrage de l'appli (SEED_DEMO=1, par défaut).
 */
import { Pool } from "pg";
import { seedDemo } from "../src/lib/seed-demo";
import { optionsPg } from "../src/db/options";

const pool = new Pool(optionsPg());

seedDemo(pool)
  .then(({ cleJury }) => {
    console.log("Données de démo prêtes : 8 API, 2 prises, 4 comptes.");
    console.log(`Clé Pass Jury : ${cleJury}`);
  })
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
