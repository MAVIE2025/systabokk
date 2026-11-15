"use client";

import { useActionState, useState } from "react";
import { poserSujet, repondre, type EtatForum } from "@/app/forum/actions";
import { bouton, champ, Erreur, Etiquette } from "@/components/ui";
import { CATEGORIES } from "@/lib/categories";

export function FormSujet({ typeInitial }: { typeInitial: "question" | "recherche_api" }) {
  const [etat, action, enCours] = useActionState<EtatForum, FormData>(poserSujet, {});
  const [type, setType] = useState(typeInitial);
  return (
    <form action={action} className="space-y-4">
      <fieldset data-guide="sujet-type">
        <legend className="mb-1 text-sm font-medium">Type de sujet</legend>
        <div className="flex flex-wrap gap-2">
          {([["question", "Question technique"], ["recherche_api", "Je cherche une API"]] as const).map(([v, n]) => (
            <label key={v} className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${type === v ? "border-accent bg-accent-soft font-medium text-accent" : "border-line bg-card"}`}>
              <input type="radio" name="type" value={v} checked={type === v} onChange={() => setType(v)} className="sr-only" />
              {n}
            </label>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">
          {type === "recherche_api"
            ? "Décrivez l'API qui vous manque. Un dev peut proposer une API du catalogue, ou la publier pour vous."
            : "Un blocage, une erreur, un conseil : la communauté vous répond."}
        </p>
      </fieldset>
      <div data-guide="sujet-titre">
        <Etiquette htmlFor="titre">Titre</Etiquette>
        <input id="titre" name="titre" required minLength={8} maxLength={140} className={champ}
          placeholder={type === "recherche_api" ? "Ex. : API pour vérifier un numéro IFU au Burkina" : "Ex. : Webhook Orange Money reçu deux fois, que faire ?"} />
      </div>
      <div data-guide="sujet-corps">
        <Etiquette htmlFor="corps">Détails</Etiquette>
        <textarea id="corps" name="corps" required minLength={15} maxLength={4000} rows={7} className={champ}
          placeholder="Contexte, ce que vous avez essayé, le résultat attendu… Le code est le bienvenu." />
      </div>
      <div data-guide="sujet-categorie">
        <Etiquette htmlFor="categorie">Domaine (facultatif)</Etiquette>
        <select id="categorie" name="categorie" className={champ} defaultValue="">
          <option value="">— Aucun —</option>
          {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.nom}</option>)}
        </select>
      </div>
      <Erreur texte={etat.erreur} />
      <button data-guide="sujet-publier" className={bouton} disabled={enCours}>{enCours ? "Publication…" : "Publier le sujet"}</button>
    </form>
  );
}

export function FormReponse({ sujetId, apis, rechercheApi }: {
  sujetId: string; apis: { slug: string; name: string; price_fcfa: number }[]; rechercheApi: boolean;
}) {
  const [etat, action, enCours] = useActionState<EtatForum, FormData>(repondre, {});
  return (
    <form action={action} key={etat.ok ? Date.now() : "f"} className="space-y-3">
      <input type="hidden" name="sujetId" value={sujetId} />
      <div data-guide="rep-corps">
        <Etiquette htmlFor="corps-reponse">Votre réponse</Etiquette>
        <textarea id="corps-reponse" name="corps" required minLength={5} maxLength={4000} rows={5} className={champ}
          placeholder="Expliquez la solution, collez un bout de code…" />
      </div>
      <div data-guide="rep-api">
        <Etiquette htmlFor="apiSlug">{rechercheApi ? "Proposer une API du catalogue" : "Lier une API du catalogue (facultatif)"}</Etiquette>
        <select id="apiSlug" name="apiSlug" className={champ} defaultValue="">
          <option value="">— Aucune —</option>
          {apis.map((a) => <option key={a.slug} value={a.slug}>{a.name} · {a.price_fcfa} FCFA / appel</option>)}
        </select>
      </div>
      <Erreur texte={etat.erreur} />
      {etat.ok && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">{etat.ok}</p>}
      <button data-guide="rep-publier" className={bouton} disabled={enCours}>{enCours ? "Envoi…" : "Publier la réponse"}</button>
    </form>
  );
}
