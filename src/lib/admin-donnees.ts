import { pool } from "@/db";

/** Commissions encaissées par la plateforme, retraits déjà faits et montant disponible (FCFA). */
export async function soldePlateforme(): Promise<{ commissions: number; retraits: number; disponible: number }> {
  const { rows } = await pool.query<{ commissions: string; retraits: string }>(
    `select coalesce(sum(amount_fcfa) filter (where kind = 'commission'), 0) as commissions,
            coalesce(-sum(amount_fcfa) filter (where kind = 'retrait'), 0) as retraits
     from ledger where dev_id is null`,
  );
  const commissions = Number(rows[0].commissions), retraits = Number(rows[0].retraits);
  return { commissions, retraits, disponible: commissions - retraits };
}
