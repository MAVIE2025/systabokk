import { pool } from "@/db";

export const dynamic = "force-dynamic";

/** Prêt : la base de données répond. Sinon 503, pour que le déploiement attende. */
export async function GET() {
  try {
    await pool.query("select 1");
    return Response.json({ statut: "pret" });
  } catch {
    return Response.json({ statut: "base_indisponible" }, { status: 503 });
  }
}
