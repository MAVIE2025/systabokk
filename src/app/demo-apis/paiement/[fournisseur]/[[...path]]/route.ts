import { randomUUID } from "node:crypto";
import { validerTelephone } from "@/lib/demo/telephone";
import { basculerPanne, pannes } from "@/lib/demo/pannes";

export const dynamic = "force-dynamic";

// Deux fournisseurs FICTIFS de paiement mobile, en mode test (aucun argent réel).
// Ils servent à montrer la prise standard « paiement-mobile » et la bascule A → B.
const FOURNISSEURS = { a: "Fournisseur A (test)", b: "Fournisseur B (test)" } as const;
type Code = keyof typeof FOURNISSEURS;


type Ctx = { params: Promise<{ fournisseur: string; path?: string[] }> };

function estCode(x: string): x is Code {
  return x in FOURNISSEURS;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { fournisseur } = await ctx.params;
  if (!estCode(fournisseur)) return Response.json({ erreur: "inconnu" }, { status: 404 });
  return Response.json({ fournisseur: FOURNISSEURS[fournisseur], en_panne: pannes.has(`paiement-${fournisseur}`) });
}

export async function POST(req: Request, ctx: Ctx) {
  const { fournisseur, path = [] } = await ctx.params;
  if (!estCode(fournisseur)) return Response.json({ erreur: "inconnu" }, { status: 404 });

  // POST …/panne  (jeton de démo requis) : bascule l'état de panne
  if (path[0] === "panne") {
    const enPanne = basculerPanne(req, `paiement-${fournisseur}`);
    if (enPanne === null) return Response.json({ erreur: "interdit" }, { status: 403 });
    return Response.json({ fournisseur: FOURNISSEURS[fournisseur], en_panne: enPanne });
  }

  if (pannes.has(`paiement-${fournisseur}`)) {
    return Response.json({ erreur: "service_indisponible" }, { status: 503 });
  }

  // POST …/paiements  { montant, telephone, reference }
  if (path[0] !== "paiements") return Response.json({ erreur: "route_inconnue" }, { status: 404 });

  const corps = (await req.json().catch(() => null)) as
    | { montant?: unknown; telephone?: unknown; reference?: unknown }
    | null;
  const montant = Number(corps?.montant);
  const tel = typeof corps?.telephone === "string" ? validerTelephone(corps.telephone) : null;

  if (!Number.isSafeInteger(montant) || montant <= 0) {
    return Response.json({ erreur: "montant_invalide" }, { status: 400 });
  }
  if (!tel?.valide) {
    return Response.json({ erreur: "telephone_invalide", detail: tel?.raison ?? "Format +226…" }, { status: 400 });
  }

  return Response.json(
    {
      transaction_id: `${fournisseur.toUpperCase()}-${randomUUID().slice(0, 8)}`,
      statut: "en_attente_confirmation",
      montant_fcfa: montant,
      telephone: tel.e164,
      reference: typeof corps?.reference === "string" ? corps.reference : null,
      fournisseur: FOURNISSEURS[fournisseur],
      mode: "test",
    },
    { status: 201 },
  );
}
