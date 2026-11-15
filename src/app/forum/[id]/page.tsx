import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { pool } from "@/db";
import { devConnecte } from "@/lib/session";
import { nomCategorie } from "@/lib/categories";
import { fcfa } from "@/lib/stats";
import {
  classeEtat, DELAI_OUBLI_JOURS, DELAI_RELANCE_HEURES, ilYa, NOMS_ETAT, NOMS_TYPE, SQL_ETAT, type Etat, type TypeSujet,
} from "@/lib/forum";
import { relancer, retirerContenu, validerReponse } from "@/app/forum/actions";
import { FormReponse } from "@/components/forum-formulaires";
import { bouton, boutonSecondaire } from "@/components/ui";

export const dynamic = "force-dynamic";

type Sujet = {
  id: string; auteur_dev_id: string; type: TypeSujet; titre: string; corps: string; categorie: string | null;
  etat: Etat; reponse_validee_id: string | null; nb_relances: number; created_at: Date; relance_at: Date;
  resolu_at: Date | null; auteur: string; pays: string; jours_restants: number; heures_depuis_relance: number;
};
type Reponse = {
  id: string; auteur_dev_id: string; corps: string; api_slug: string | null; created_at: Date; auteur: string; pays: string;
  api_name: string | null; api_price: number | null;
};

export default async function SujetForum({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const { rows } = await pool.query<Sujet>(
    `select s.id, s.auteur_dev_id, s.type, s.titre, s.corps, s.categorie, ${SQL_ETAT} as etat, s.reponse_validee_id,
            s.nb_relances, s.created_at, s.relance_at, s.resolu_at, d.name as auteur, d.country as pays,
            greatest(0, ceil(extract(epoch from (s.relance_at + interval '${DELAI_OUBLI_JOURS} days' - now())) / 86400))::int as jours_restants,
            (extract(epoch from (now() - s.relance_at)) / 3600)::float as heures_depuis_relance
     from forum_sujets s join devs d on d.id = s.auteur_dev_id
     where s.id = $1 and s.supprime_at is null`,
    [id],
  );
  const s = rows[0];
  if (!s) notFound();

  const [dev, { rows: reponses }, { rows: apis }] = await Promise.all([
    devConnecte(),
    pool.query<Reponse>(
      `select r.id, r.auteur_dev_id, r.corps, r.api_slug, r.created_at, d.name as auteur, d.country as pays,
              a.name as api_name, a.price_fcfa as api_price
       from forum_reponses r join devs d on d.id = r.auteur_dev_id
       left join apis a on a.slug = r.api_slug and a.is_active and a.deleted_at is null
       where r.sujet_id = $1 and r.supprime_at is null
       order by (r.id = $2) desc, r.created_at asc`,
      [s.id, s.reponse_validee_id],
    ),
    pool.query<{ slug: string; name: string; price_fcfa: number }>(
      "select slug, name, price_fcfa from apis where is_active and deleted_at is null order by name",
    ),
  ]);

  const estAuteur = dev?.id === s.auteur_dev_id;
  const peutRelancer = estAuteur && s.etat !== "resolu" && s.heures_depuis_relance >= DELAI_RELANCE_HEURES;

  return (
    <div className="mx-auto max-w-3xl py-10">
      <Link href="/forum" data-guide="sujet-retour" className="text-sm text-accent">← Forum</Link>

      <article className="mt-3 rounded-xl border border-line bg-card p-5">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span data-guide="sujet-etat" className={`rounded-full border px-2.5 py-0.5 font-medium ${classeEtat[s.etat]}`}>{NOMS_ETAT[s.etat]}</span>
          <span className={s.type === "recherche_api" ? "font-medium text-ocre" : "text-muted"}>{NOMS_TYPE[s.type]}</span>
          {s.categorie && <span className="text-muted">· {nomCategorie(s.categorie)}</span>}
        </div>
        <h1 className="mt-2 text-2xl font-semibold">{s.titre}</h1>
        <p className="mt-1 text-sm text-muted">
          {s.auteur} ({s.pays}) · posé {ilYa(s.created_at)}
          {s.nb_relances > 0 ? ` · relancé ${s.nb_relances} fois, la dernière ${ilYa(s.relance_at)}` : ""}
        </p>
        <p className="mt-4 whitespace-pre-wrap leading-relaxed">{s.corps}</p>

        <div data-guide="sujet-statut" className="mt-5 rounded-lg bg-accent-soft px-4 py-3 text-sm">
          {s.etat === "resolu" && <>✓ Résolu {s.resolu_at ? ilYa(s.resolu_at) : ""} : l&apos;auteur a validé la réponse marquée ci-dessous.</>}
          {s.etat === "ouvert" && <>En attente de validation par l&apos;auteur. Sans validation ni relance, ce sujet passera « Oublié » dans <b>{s.jours_restants} jour{s.jours_restants > 1 ? "s" : ""}</b>.</>}
          {s.etat === "oublie" && <>Oublié : aucune réponse n&apos;a été validée depuis {DELAI_OUBLI_JOURS} jours. L&apos;auteur peut le relancer pour le remettre en tête du forum.</>}
        </div>

        {(estAuteur || dev?.estAdmin) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {estAuteur && s.etat !== "resolu" && (
              peutRelancer ? (
                <form action={relancer}>
                  <input type="hidden" name="sujetId" value={s.id} />
                  <button data-guide="sujet-relancer" className={boutonSecondaire}>↻ Relancer le sujet</button>
                </form>
              ) : (
                <p data-guide="sujet-relancer" className="text-xs text-muted">Vous pourrez relancer ce sujet 24 h après sa publication ou sa dernière relance.</p>
              )
            )}
            {dev?.estAdmin && (
              <form action={retirerContenu}>
                <input type="hidden" name="sujetId" value={s.id} />
                <button className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700 hover:bg-red-50">Retirer le sujet (admin)</button>
              </form>
            )}
          </div>
        )}
      </article>

      <h2 className="mt-8 text-lg font-semibold">{reponses.length} réponse{reponses.length > 1 ? "s" : ""}</h2>
      {reponses.length === 0 && <p className="mt-2 text-sm text-muted">Pas encore de réponse. Soyez le premier à aider.</p>}
      <ul data-guide="sujet-reponses" className="mt-3 space-y-3">
        {reponses.map((r) => {
          const validee = r.id === s.reponse_validee_id;
          return (
            <li key={r.id} className={`rounded-xl border bg-card p-4 ${validee ? "border-green-400 ring-1 ring-green-200" : "border-line"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted">{r.auteur} ({r.pays}) · {ilYa(r.created_at)}</p>
                {validee && <span className="rounded-full border border-green-200 bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-800">✓ Réponse validée</span>}
              </div>
              <p className="mt-2 whitespace-pre-wrap leading-relaxed">{r.corps}</p>
              {r.api_slug && r.api_name && (
                <Link href={`/catalogue/${r.api_slug}`} className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-blue-100 bg-accent-soft px-3 py-2 text-sm hover:border-accent">
                  <span><span className="text-muted">API proposée :</span> <b>{r.api_name}</b></span>
                  <span className="whitespace-nowrap text-accent">{fcfa(r.api_price ?? 0)} / appel · Voir la fiche →</span>
                </Link>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                {estAuteur && s.etat !== "resolu" && r.auteur_dev_id !== dev?.id && (
                  <form action={validerReponse}>
                    <input type="hidden" name="sujetId" value={s.id} />
                    <input type="hidden" name="reponseId" value={r.id} />
                    <button data-guide="rep-valider" className={`${bouton} !px-3 !py-1.5 text-sm`}>✓ Cette réponse règle mon problème</button>
                  </form>
                )}
                {dev?.estAdmin && (
                  <form action={retirerContenu}>
                    <input type="hidden" name="sujetId" value={s.id} />
                    <input type="hidden" name="reponseId" value={r.id} />
                    <button className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50">Retirer (admin)</button>
                  </form>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <section className="mt-8 rounded-xl border border-line bg-card p-5">
        {s.etat === "resolu" ? (
          <p className="text-sm text-muted">Ce sujet est résolu : les réponses sont fermées.</p>
        ) : dev ? (
          <FormReponse sujetId={s.id} apis={apis} rechercheApi={s.type === "recherche_api"} />
        ) : (
          <p className="text-sm">
            <Link href="/espace" className="text-accent underline">Connectez-vous</Link> ou{" "}
            <Link href="/jury" className="text-accent underline">entrez avec le Pass Jury</Link> pour répondre.
          </p>
        )}
        {s.type === "recherche_api" && s.etat !== "resolu" && (
          <p className="mt-4 border-t border-line pt-3 text-sm text-muted">
            Vous savez coder cette API ? <Link href="/publier" className="text-accent underline">Publiez-la sur SystaBokk</Link>,
            puis proposez-la ici : l&apos;auteur du sujet sera votre premier client.
          </p>
        )}
      </section>
    </div>
  );
}
