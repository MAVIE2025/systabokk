"use client";

import { useActionState, useState } from "react";
import { bloquerCompte, type EtatAdmin } from "@/app/admin/actions";

/** Bloquer un compte : demande le motif (gardé dans le journal) avant de confirmer. */
export function FormBlocage({ devId, guide }: { devId: string; guide?: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [etat, envoyer, enCours] = useActionState<EtatAdmin, FormData>(bloquerCompte, {});
  if (etat.ok) return <span className="text-xs text-green-700">Bloqué ✓</span>;
  if (!ouvert)
    return (
      <button type="button" data-guide={guide} onClick={() => setOuvert(true)}
        className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50">
        Bloquer
      </button>
    );
  return (
    <form action={envoyer} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="devId" value={devId} />
      <input name="motif" required minLength={3} maxLength={200} autoFocus placeholder="Motif du blocage"
        aria-label="Motif du blocage" className="w-40 rounded-md border border-line px-2 py-1 text-xs" />
      <button disabled={enCours} className="rounded-md bg-red-600 px-2.5 py-1 text-xs font-medium text-white">Confirmer</button>
      <button type="button" onClick={() => setOuvert(false)} className="text-xs text-muted underline">Annuler</button>
      {etat.erreur && <span role="alert" className="w-full text-xs text-red-700">{etat.erreur}</span>}
    </form>
  );
}
