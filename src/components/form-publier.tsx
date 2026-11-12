"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { publierApi, type EtatFormulaire } from "@/app/actions";
import { CATEGORIES, PAYS_PUBLICATION } from "@/lib/categories";
import { bouton, champ, Erreur, Etiquette } from "@/components/ui";

type Prise = { slug: string; name: string };

export function FormPublier({ prises }: { prises: Prise[] }) {
  const [etat, action, enCours] = useActionState<EtatFormulaire, FormData>(publierApi, {});
  const [methode, setMethode] = useState("GET");
  const [categorie, setCategorie] = useState("");

  if (etat.slug) {
    return (
      <div className="rounded-xl border border-accent bg-accent-soft p-5">
        <h2 className="font-semibold">Votre API est publiée</h2>
        <p className="mt-1 text-sm text-muted">Elle est dans le catalogue. Chaque appel crédite votre portefeuille.</p>
        <p className="mt-3 text-sm">Adresse pour vos utilisateurs :</p>
        <code data-guide="pub-adresse" className="mt-1 block break-all rounded-md bg-card p-3 text-sm">/v1/apis/{etat.slug}</code>
        <div className="mt-4 flex gap-3">
          <Link href={`/catalogue/${etat.slug}`} className={bouton}>Voir la fiche</Link>
          <Link href="/espace" className="rounded-lg border border-line bg-card px-4 py-2.5 font-medium">Mon espace</Link>
        </div>
      </div>
    );
  }

  const aide = CATEGORIES.find((c) => c.slug === categorie)?.exemple;

  return (
    <form action={action} className="space-y-5">
      <fieldset className="space-y-4">
        <legend className="mb-2 font-semibold">1. Votre API</legend>
        <div>
          <Etiquette htmlFor="name">Nom</Etiquette>
          <input id="name" name="name" required maxLength={60} className={champ} placeholder="Ex. Traduction français → mooré" />
        </div>
        <div>
          <Etiquette htmlFor="description">Ce qu&apos;elle fait</Etiquette>
          <textarea id="description" name="description" required maxLength={300} rows={3} className={champ}
            placeholder="Une ou deux phrases claires pour les autres devs." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Etiquette htmlFor="category">Catégorie</Etiquette>
            <select id="category" name="category" required className={champ} value={categorie}
              onChange={(e) => setCategorie(e.target.value)}>
              <option value="" disabled>Choisir…</option>
              {CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.nom}</option>)}
            </select>
            {aide && <p className="mt-1 text-xs text-muted">Ex. : {aide}</p>}
          </div>
          <div>
            <Etiquette htmlFor="priceFcfa">Prix par appel (FCFA)</Etiquette>
            <input id="priceFcfa" name="priceFcfa" type="number" min={4} max={100000} required defaultValue={8} className={champ} />
            <p className="mt-1 text-xs text-muted">Vous recevez 75 % de chaque appel, la plateforme garde 25 %. Minimum 4 FCFA.</p>
          </div>
        </div>
        <div>
          <span className="mb-1 block text-sm font-medium">Pays couverts</span>
          <div data-guide="pub-pays" className="flex flex-wrap gap-2">
            {PAYS_PUBLICATION.map((p) => (
              <label key={p} className="flex items-center gap-1.5 rounded-md border border-line bg-card px-2.5 py-1.5 text-sm">
                <input type="checkbox" name="countries" value={p} defaultChecked={p === "BF"} /> {p}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 font-semibold">2. Où elle tourne</legend>
        <div>
          <Etiquette htmlFor="upstreamUrl">Adresse de base de votre API (https)</Etiquette>
          <input id="upstreamUrl" name="upstreamUrl" required className={champ} placeholder="https://mon-api.mondomaine.com/v1" />
          <p className="mt-1 text-xs text-muted">
            Hébergée de préférence sur Systalink Datacloud. Les adresses internes ou privées sont refusées.
          </p>
        </div>
        <div>
          <Etiquette htmlFor="docUrl">Documentation (facultatif)</Etiquette>
          <input id="docUrl" name="docUrl" className={champ} placeholder="https://…" />
        </div>
        {prises.length > 0 && (
          <div>
            <Etiquette htmlFor="priseSlug">Prise standard (facultatif)</Etiquette>
            <select id="priseSlug" name="priseSlug" className={champ} defaultValue="">
              <option value="">Aucune</option>
              {prises.map((p) => <option key={p.slug} value={p.slug}>{p.name}</option>)}
            </select>
            <p className="mt-1 text-xs text-muted">
              Si votre API respecte l&apos;interface d&apos;une prise, elle peut servir de relais quand un autre fournisseur tombe.
            </p>
          </div>
        )}
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 font-semibold">3. Exemple pour le bouton « Essayer »</legend>
        <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
          <div>
            <Etiquette htmlFor="exampleMethod">Méthode</Etiquette>
            <select id="exampleMethod" name="exampleMethod" className={champ} value={methode} onChange={(e) => setMethode(e.target.value)}>
              <option>GET</option><option>POST</option>
            </select>
          </div>
          <div>
            <Etiquette htmlFor="examplePath">Chemin ou paramètres</Etiquette>
            <input id="examplePath" name="examplePath" className={champ} placeholder="?texte=Bonjour  ou  /traductions" />
          </div>
        </div>
        {methode === "POST" && (
          <div>
            <Etiquette htmlFor="exampleBody">Corps JSON</Etiquette>
            <textarea id="exampleBody" name="exampleBody" rows={4} className={`${champ} font-mono`} placeholder='{ "texte": "Bonjour" }' />
          </div>
        )}
      </fieldset>

      <Erreur texte={etat.erreur} />
      <button data-guide="pub-bouton" className={bouton} disabled={enCours}>{enCours ? "Vérification…" : "Publier l'API"}</button>
    </form>
  );
}
