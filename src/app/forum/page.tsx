import Link from "next/link";
import { devConnecte } from "@/lib/session";
import { nomCategorie } from "@/lib/categories";
import {
  classeEtat, compterEtats, DELAI_OUBLI_JOURS, ilYa, listerSujets, NOMS_ETAT, NOMS_TYPE, type Etat, type Tri,
} from "@/lib/forum";
import { bouton } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Forum · SystaBokk" };

type Params = { etat?: string; type?: string; q?: string; tri?: string };

export default async function Forum({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const tri: Tri = sp.tri === "bientot-oublies" ? "bientot-oublies" : "recents";
  const [dev, sujets, comptes] = await Promise.all([
    devConnecte(),
    listerSujets({ etat: sp.etat, type: sp.type, q: sp.q, tri }).catch(() => []),
    compterEtats().catch(() => ({ ouvert: 0, resolu: 0, oublie: 0 })),
  ]);
  const total = comptes.ouvert + comptes.resolu + comptes.oublie;

  // Construit un lien de filtre en gardant les autres paramètres
  const lien = (maj: Partial<Params>) => {
    const p = new URLSearchParams();
    const tout = { ...sp, ...maj };
    for (const [k, v] of Object.entries(tout)) if (v) p.set(k, v);
    const s = p.toString();
    return s ? `/forum?${s}` : "/forum";
  };
  const chip = (actif: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${actif ? "border-accent bg-accent-soft font-medium text-accent" : "border-line bg-card hover:border-accent"}`;

  return (
    <div className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-2xl font-semibold">Forum des développeurs</h1>
          <p className="mt-1 text-muted">
            Posez vos questions, aidez les autres, et cherchez l&apos;API qui vous manque : si quelqu&apos;un la publie,
            vous devenez son premier client. Un sujet non validé pendant {DELAI_OUBLI_JOURS} jours passe « Oublié » ;
            son auteur peut le relancer.
          </p>
        </div>
        <Link href="/forum/nouveau" data-guide="forum-poser" className={bouton}>Poser une question</Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div data-guide="forum-etats" className="flex flex-wrap gap-2">
          <Link href={lien({ etat: undefined })} className={chip(!sp.etat)}>Tous <span className="text-muted">{total}</span></Link>
          {(["ouvert", "resolu", "oublie"] as Etat[]).map((e) => (
            <Link key={e} href={lien({ etat: e })} className={chip(sp.etat === e)}>
              {NOMS_ETAT[e]} <span className="text-muted">{comptes[e]}</span>
            </Link>
          ))}
        </div>
        <form data-guide="forum-recherche" className="flex gap-2">
          {sp.etat && <input type="hidden" name="etat" value={sp.etat} />}
          {sp.type && <input type="hidden" name="type" value={sp.type} />}
          {sp.tri && <input type="hidden" name="tri" value={sp.tri} />}
          <input name="q" defaultValue={sp.q} placeholder="Rechercher un sujet…" aria-label="Rechercher un sujet"
            className="rounded-lg border border-line bg-card px-3 py-2 text-sm" />
        </form>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div data-guide="forum-types" className="flex flex-wrap items-center gap-2">
          <span className="text-muted">Type :</span>
          <Link href={lien({ type: undefined })} className={chip(!sp.type)}>Tous</Link>
          <Link href={lien({ type: "question" })} className={chip(sp.type === "question")}>Questions</Link>
          <Link href={lien({ type: "recherche_api" })} className={chip(sp.type === "recherche_api")}>Je cherche une API</Link>
        </div>
        <div data-guide="forum-tri" className="flex flex-wrap items-center gap-2">
          <span className="text-muted">Trier :</span>
          <Link href={lien({ tri: undefined })} className={chip(tri === "recents")}>Plus récents</Link>
          <Link href={lien({ tri: "bientot-oublies" })} className={chip(tri === "bientot-oublies")}>Bientôt oubliés</Link>
        </div>
      </div>

      {sujets.length === 0 && (
        <p className="mt-10 text-muted">
          Aucun sujet ne correspond. {dev ? <Link href="/forum/nouveau" className="text-accent underline">Posez la première question</Link> : null}
        </p>
      )}

      <ul data-guide="forum-liste" className="mt-6 space-y-3">
        {sujets.map((s) => (
          <li key={s.id}>
            <Link href={`/forum/${s.id}`} className="flex flex-col gap-2 rounded-xl border border-line bg-card p-4 hover:border-accent sm:flex-row sm:items-start sm:gap-4">
              <div className="flex shrink-0 flex-row gap-2 sm:w-28 sm:flex-col">
                <span className={`w-max rounded-full border px-2.5 py-0.5 text-xs font-medium ${classeEtat[s.etat]}`}>{NOMS_ETAT[s.etat]}</span>
                <span className="text-xs text-muted">{s.nb_reponses} réponse{s.nb_reponses > 1 ? "s" : ""}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">
                  <span className={s.type === "recherche_api" ? "font-medium text-ocre" : ""}>{NOMS_TYPE[s.type]}</span>
                  {s.categorie ? ` · ${nomCategorie(s.categorie)}` : ""}
                </p>
                <h2 className="font-semibold">{s.titre}</h2>
                <p className="mt-0.5 line-clamp-2 text-sm text-muted">{s.extrait}</p>
                <p className="mt-1.5 text-xs text-muted">
                  {s.auteur} ({s.pays}) · posé {ilYa(s.created_at)}
                  {s.nb_relances > 0 ? ` · relancé ${ilYa(s.relance_at)}` : ""}
                  {s.etat === "ouvert" && (
                    <span className={s.jours_restants <= 2 ? " font-medium text-amber-700" : ""}>
                      {` · oublié dans ${s.jours_restants} j sans validation`}
                    </span>
                  )}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
