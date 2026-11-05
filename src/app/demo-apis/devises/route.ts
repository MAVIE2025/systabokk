export const dynamic = "force-dynamic";

// API de démo : conversion entre FCFA et euro, à PARITÉ FIXE (1 EUR = 655,957 FCFA).
// Le franc CFA UEMOA (XOF) et le franc CFA CEMAC (XAF) sont à parité 1:1 entre eux.
const PAR_EURO: Record<string, number> = { EUR: 1, XOF: 655.957, XAF: 655.957 };

/** GET ?montant=10000&de=XOF&vers=EUR */
export function GET(req: Request) {
  const u = new URL(req.url);
  const montant = Number((u.searchParams.get("montant") ?? "").replace(",", "."));
  const de = (u.searchParams.get("de") ?? "XOF").toUpperCase();
  const vers = (u.searchParams.get("vers") ?? "EUR").toUpperCase();

  if (!Number.isFinite(montant) || montant < 0) {
    return Response.json({ erreur: "montant_invalide", message: "Exemple : ?montant=10000&de=XOF&vers=EUR" }, { status: 400 });
  }
  if (!(de in PAR_EURO) || !(vers in PAR_EURO)) {
    return Response.json(
      { erreur: "devise_non_prise_en_charge", devises: Object.keys(PAR_EURO), message: "Seules les devises à parité fixe sont prises en charge." },
      { status: 400 },
    );
  }
  const brut = (montant / PAR_EURO[de]) * PAR_EURO[vers];
  const decimales = vers === "EUR" ? 2 : 0; // le FCFA n'a pas de centimes
  return Response.json({
    montant,
    de,
    vers,
    resultat: Number(brut.toFixed(decimales)),
    taux: Number((PAR_EURO[vers] / PAR_EURO[de]).toFixed(6)),
    source: "Parité fixe : 1 EUR = 655,957 FCFA",
  });
}
