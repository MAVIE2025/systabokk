import { PAYS, validerTelephone } from "@/lib/demo/telephone";

export const dynamic = "force-dynamic";

/** API de démo : validation et formatage. GET ?numero=70123456&pays=BF */
export function GET(req: Request) {
  const url = new URL(req.url);
  const numero = url.searchParams.get("numero");
  if (!numero) {
    return Response.json(
      { erreur: "numero_manquant", pays_pris_en_charge: Object.keys(PAYS) },
      { status: 400 },
    );
  }
  return Response.json(validerTelephone(numero, url.searchParams.get("pays") ?? undefined));
}
