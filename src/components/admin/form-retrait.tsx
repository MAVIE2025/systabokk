"use client";

import { useActionState } from "react";
import { enregistrerRetrait, type EtatAdmin } from "@/app/admin/actions";
import { bouton, champ } from "@/components/ui";

/** Retrait des commissions de la plateforme vers un compte Systalink. */
export function FormRetrait({ disponible }: { disponible: number }) {
  const [etat, envoyer, enCours] = useActionState<EtatAdmin, FormData>(enregistrerRetrait, {});
  return (
    <form action={envoyer} className="grid gap-4 sm:grid-cols-3">
      <div>
        <label htmlFor="montant" className="text-sm font-medium">Montant (FCFA)</label>
        <input id="montant" name="montant" type="number" min={100} max={Math.max(100, disponible)} step={1} required
          defaultValue={disponible >= 100 ? disponible : undefined} className={`mt-1 ${champ}`} />
      </div>
      <div>
        <label htmlFor="moyen" className="text-sm font-medium">Vers</label>
        <select id="moyen" name="moyen" required className={`mt-1 ${champ}`} defaultValue="">
          <option value="" disabled>Choisir…</option>
          <option>Orange Money</option><option>Moov Money</option><option>Wave</option>
          <option>Virement bancaire</option><option>Crédits Systalink</option>
        </select>
      </div>
      <div>
        <label htmlFor="reference" className="text-sm font-medium">Référence de l&apos;opération</label>
        <input id="reference" name="reference" required minLength={3} maxLength={80} placeholder="ex. OM-2026-11-0042" className={`mt-1 ${champ}`} />
      </div>
      <div className="sm:col-span-3 flex flex-wrap items-center gap-3">
        <button data-guide="adm-retrait-bouton" disabled={enCours || disponible < 100} className={bouton}>
          {enCours ? "Enregistrement…" : "Enregistrer le retrait"}
        </button>
        {etat.ok && <p role="status" className="text-sm text-green-700">{etat.ok}</p>}
        {etat.erreur && <p role="alert" className="text-sm text-red-700">{etat.erreur}</p>}
        {disponible < 100 && <p className="text-sm text-muted">Il faut au moins 100 FCFA disponibles.</p>}
      </div>
    </form>
  );
}
