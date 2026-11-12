"use client";

import { useActionState } from "react";
import { connecter, type EtatFormulaire } from "@/app/actions";
import { bouton, champ, Erreur, Etiquette } from "@/components/ui";

export function FormConnexion() {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(connecter, {});
  return (
    <form action={action} className="space-y-3">
      <Etiquette htmlFor="cle">Votre clé SystaBokk</Etiquette>
      <input id="cle" name="cle" required className={champ} placeholder="sbk_live_…" autoComplete="off" />
      <Erreur texte={etat.erreur} />
      <button data-guide="cnx-bouton" className={bouton} disabled={enCours}>Se connecter</button>
    </form>
  );
}
