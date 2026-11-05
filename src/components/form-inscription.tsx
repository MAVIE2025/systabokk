"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { inscrire, type EtatFormulaire } from "@/app/actions";
import { PAYS_PUBLICATION } from "@/lib/categories";
import { bouton, champ, Erreur, Etiquette } from "@/components/ui";

export function FormInscription() {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(inscrire, {});
  const [copie, setCopie] = useState(false);

  if (etat.cle) {
    return (
      <div className="rounded-xl border border-accent bg-accent-soft p-5">
        <h2 className="font-semibold">Votre clé SystaBokk</h2>
        <p className="mt-1 text-sm text-muted">
          Elle ne sera plus affichée : copiez-la maintenant. Elle sert à appeler toutes les API et à vous reconnecter.
        </p>
        <code className="mt-3 block break-all rounded-md bg-card p-3 text-sm">{etat.cle}</code>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            className={bouton}
            onClick={() => navigator.clipboard.writeText(etat.cle!).then(() => setCopie(true))}
          >
            {copie ? "Copiée ✓" : "Copier la clé"}
          </button>
          <Link href="/espace" className="rounded-lg border border-line bg-card px-4 py-2.5 font-medium">
            Aller à mon espace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <Etiquette htmlFor="name">Nom</Etiquette>
        <input id="name" name="name" required className={champ} placeholder="Aminata Ouédraogo" />
      </div>
      <div>
        <Etiquette htmlFor="email">E-mail</Etiquette>
        <input id="email" name="email" type="email" required className={champ} placeholder="vous@exemple.com" />
      </div>
      <div>
        <Etiquette htmlFor="country">Pays</Etiquette>
        <select id="country" name="country" className={champ} defaultValue="BF">
          {PAYS_PUBLICATION.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <Erreur texte={etat.erreur} />
      <button className={bouton} disabled={enCours}>{enCours ? "Création…" : "Créer mon compte"}</button>
    </form>
  );
}
