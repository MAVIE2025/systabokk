"use client";

import { useActionState, useState } from "react";
import { reinitialiserCle, type EtatAdmin } from "@/app/admin/actions";

/** « Mot de passe oublié » : génère une nouvelle clé (l'ancienne cesse de marcher) et l'affiche une seule fois. */
export function ResetCle({ devId, guide }: { devId: string; guide?: string }) {
  const [arme, setArme] = useState(false);
  const [copie, setCopie] = useState(false);
  const [etat, envoyer, enCours] = useActionState<EtatAdmin, FormData>(reinitialiserCle, {});

  if (etat.cle)
    return (
      <div className="rounded-md border border-green-200 bg-green-50 p-2 text-xs">
        <p className="font-medium text-green-800">Nouvelle clé (à transmettre, affichée une seule fois) :</p>
        <code className="mt-1 block break-all font-mono">{etat.cle}</code>
        <button type="button" className="mt-1 text-accent underline"
          onClick={async () => { try { await navigator.clipboard.writeText(etat.cle!); setCopie(true); } catch { /* copie manuelle */ } }}>
          {copie ? "Copiée ✓" : "Copier"}
        </button>
      </div>
    );

  return (
    <form action={envoyer} className="inline">
      <input type="hidden" name="devId" value={devId} />
      <button
        type="button"
        data-guide={guide}
        disabled={enCours}
        onClick={(e) => {
          if (arme) e.currentTarget.form?.requestSubmit();
          else { setArme(true); setTimeout(() => setArme(false), 5000); }
        }}
        className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap ${arme ? "bg-amber-600 text-white" : "border border-line hover:border-accent hover:text-accent"}`}
      >
        {arme ? "Confirmer : l'ancienne clé ne marchera plus" : "Nouvelle clé"}
      </button>
      {etat.erreur && <span role="alert" className="ml-2 text-xs text-red-700">{etat.erreur}</span>}
    </form>
  );
}
