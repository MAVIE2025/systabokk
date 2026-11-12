"use client";

import { useEffect, useState } from "react";

/**
 * Bouton d'action admin en deux temps : le premier clic demande confirmation,
 * le second envoie le formulaire. Évite les fausses manœuvres sans fenêtre surgissante.
 */
export function BoutonConfirme({
  action, champs, libelle, confirmation, danger = false, guide,
}: {
  action: (f: FormData) => Promise<void>;
  champs: Record<string, string>;
  libelle: string;
  confirmation?: string;
  danger?: boolean;
  guide?: string;
}) {
  const [arme, setArme] = useState(false);
  useEffect(() => {
    if (!arme) return;
    const t = setTimeout(() => setArme(false), 5000);
    return () => clearTimeout(t);
  }, [arme]);

  const base = "rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap";
  const style = arme
    ? "bg-red-600 text-white"
    : danger ? "border border-red-200 text-red-700 hover:bg-red-50" : "border border-line hover:border-accent hover:text-accent";

  return (
    <form action={action} className="inline">
      {Object.entries(champs).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <button
        type="button"
        data-guide={guide}
        // Toujours « button » : changer le type pendant le clic soumettrait dès le premier clic
        onClick={(e) => { if (confirmation && !arme) setArme(true); else e.currentTarget.form?.requestSubmit(); }}
        className={`${base} ${style}`}
      >
        {arme ? confirmation : libelle}
      </button>
    </form>
  );
}
