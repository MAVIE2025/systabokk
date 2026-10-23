import { pool } from "@/db";

export type Stats = { apis: number; devs: number; appels: number; gainsCreateurs: number };

/** Chiffres réels affichés sur l'accueil. Zéro si la base n'est pas joignable. */
export async function getStats(): Promise<Stats> {
  try {
    const { rows } = await pool.query<{ apis: string; devs: string; appels: string; gains: string }>(`
      select
        (select count(*) from apis where is_active) as apis,
        (select count(*) from devs) as devs,
        (select count(*) from calls where billed) as appels,
        (select coalesce(sum(amount_fcfa), 0) from ledger where kind = 'revenu') as gains
    `);
    const r = rows[0];
    return { apis: +r.apis, devs: +r.devs, appels: +r.appels, gainsCreateurs: +r.gains };
  } catch {
    return { apis: 0, devs: 0, appels: 0, gainsCreateurs: 0 };
  }
}

export const fcfa = (n: number) => n.toLocaleString("fr-FR") + " FCFA";
