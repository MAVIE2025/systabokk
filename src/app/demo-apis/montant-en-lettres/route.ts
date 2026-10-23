import { nombreEnLettres } from "@/lib/demo/nombre-en-lettres";

export const dynamic = "force-dynamic";

/** API de démo : montant en lettres pour les factures. GET ?montant=12500&devise=FCFA */
export function GET(req: Request) {
  const url = new URL(req.url);
  const brut = (url.searchParams.get("montant") ?? "").replace(/[\s.]/g, "");
  const devise = url.searchParams.get("devise") ?? "francs CFA";
  const montant = Number(brut);

  if (!/^\d+$/.test(brut) || !Number.isSafeInteger(montant) || montant > 999_999_999_999) {
    return Response.json(
      { erreur: "montant_invalide", message: "Donnez un entier positif, par exemple ?montant=12500." },
      { status: 400 },
    );
  }
  const lettres = nombreEnLettres(montant);
  return Response.json({
    montant,
    lettres,
    texte_facture: `Arrêtée la présente facture à la somme de ${lettres} (${montant.toLocaleString("fr-FR")}) ${devise}.`,
  });
}
