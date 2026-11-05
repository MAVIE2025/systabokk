"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { essayerApi, type ResultatEssai } from "@/app/actions";
import { bouton } from "@/components/ui";

export function Essayer({ slug, connecte }: { slug: string; connecte: boolean }) {
  const [res, setRes] = useState<ResultatEssai | null>(null);
  const [enCours, demarrer] = useTransition();

  if (!connecte) {
    return (
      <div className="rounded-xl border border-dashed border-line p-4 text-sm">
        Pour essayer, <Link href="/jury" className="text-accent underline">entrez avec le Pass Jury</Link> ou{" "}
        <Link href="/inscription" className="text-accent underline">créez un compte</Link> (1 000 FCFA de test offerts).
      </div>
    );
  }

  const estSvg = res?.contentType?.includes("image/svg");
  let affiche = res?.corps ?? "";
  if (res?.contentType?.includes("json")) {
    try { affiche = JSON.stringify(JSON.parse(affiche), null, 2); } catch {}
  }

  return (
    <div>
      <button className={bouton} disabled={enCours} onClick={() => demarrer(async () => setRes(await essayerApi(slug)))}>
        {enCours ? "Appel en cours…" : "Essayer (appel réel, payé)"}
      </button>
      {res?.erreur && <p className="mt-3 text-sm text-red-700">{res.erreur === "connexion" ? "Connectez-vous d'abord." : res.erreur}</p>}
      {res?.status && (
        <div className="mt-4 rounded-xl border border-line bg-card p-4">
          <p className="font-mono text-xs text-muted">{res.url}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className={`rounded-full px-2.5 py-1 ${res.status < 400 ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>HTTP {res.status}</span>
            {res.prix && <span className="rounded-full bg-background px-2.5 py-1">Prix : {res.prix} FCFA</span>}
            {res.solde && <span className="rounded-full bg-background px-2.5 py-1">Solde : {Number(res.solde).toLocaleString("fr-FR")} FCFA</span>}
            {res.fournisseur && <span className="rounded-full bg-accent-soft px-2.5 py-1 font-medium text-accent">Servi par : {res.fournisseur}</span>}
            {res.bascule && res.bascule !== "non" && <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-800">Bascule : {res.bascule} en panne</span>}
          </div>
          {estSvg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img alt="Réponse de l'API (image)" className="mt-3 h-40 w-40 rounded bg-white p-2"
              src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(res.corps ?? "")}`} />
          ) : (
            <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-background p-3 text-xs">{affiche}</pre>
          )}
        </div>
      )}
    </div>
  );
}
