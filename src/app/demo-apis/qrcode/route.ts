import QRCode from "qrcode";

export const dynamic = "force-dynamic";

/** API de démo : QR code en SVG. GET ?texte=https://…&taille=256 */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const texte = u.searchParams.get("texte") ?? "";
  const taille = Math.min(1024, Math.max(64, Number(u.searchParams.get("taille")) || 256));
  if (!texte || texte.length > 1000) {
    return Response.json({ erreur: "texte_invalide", message: "Donnez ?texte= (1 000 caractères au plus)." }, { status: 400 });
  }
  const svg = await QRCode.toString(texte, { type: "svg", width: taille, margin: 1, errorCorrectionLevel: "M" });
  return new Response(svg, { headers: { "content-type": "image/svg+xml; charset=utf-8" } });
}
