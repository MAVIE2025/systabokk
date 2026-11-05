import { randomUUID } from "node:crypto";
import { validerTelephone } from "@/lib/demo/telephone";
import { basculerPanne, pannes } from "@/lib/demo/pannes";

export const dynamic = "force-dynamic";

// Deux fournisseurs SMS FICTIFS (aucun SMS réel n'est envoyé), derrière la prise « sms ».
const FOURNISSEURS = { a: "SMS Fournisseur A (test)", b: "SMS Fournisseur B (test)" } as const;
type Code = keyof typeof FOURNISSEURS;
type Ctx = { params: Promise<{ fournisseur: string; path?: string[] }> };
const estCode = (x: string): x is Code => x in FOURNISSEURS;

export async function POST(req: Request, ctx: Ctx) {
  const { fournisseur, path = [] } = await ctx.params;
  if (!estCode(fournisseur)) return Response.json({ erreur: "inconnu" }, { status: 404 });

  if (path[0] === "panne") {
    const enPanne = basculerPanne(req, `sms-${fournisseur}`);
    if (enPanne === null) return Response.json({ erreur: "interdit" }, { status: 403 });
    return Response.json({ fournisseur: FOURNISSEURS[fournisseur], en_panne: enPanne });
  }
  if (pannes.has(`sms-${fournisseur}`)) return Response.json({ erreur: "service_indisponible" }, { status: 503 });
  if (path[0] !== "envois") return Response.json({ erreur: "route_inconnue" }, { status: 404 });

  // POST …/envois  { telephone, message }
  const corps = (await req.json().catch(() => null)) as { telephone?: unknown; message?: unknown } | null;
  const tel = typeof corps?.telephone === "string" ? validerTelephone(corps.telephone) : null;
  const message = typeof corps?.message === "string" ? corps.message.trim() : "";
  if (!tel?.valide) return Response.json({ erreur: "telephone_invalide", detail: tel?.raison ?? "Format +226…" }, { status: 400 });
  if (!message || message.length > 480) {
    return Response.json({ erreur: "message_invalide", message: "Entre 1 et 480 caractères." }, { status: 400 });
  }

  return Response.json(
    {
      id: `SMS-${fournisseur.toUpperCase()}-${randomUUID().slice(0, 8)}`,
      statut: "envoye_simulation",
      telephone: tel.e164,
      segments: Math.ceil(message.length / 160),
      fournisseur: FOURNISSEURS[fournisseur],
      mode: "test",
    },
    { status: 201 },
  );
}
