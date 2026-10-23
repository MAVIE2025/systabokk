export const dynamic = "force-dynamic";

/** Vivant : le processus répond. */
export function GET() {
  return Response.json({ statut: "ok", version: process.env.APP_VERSION ?? "dev" });
}
