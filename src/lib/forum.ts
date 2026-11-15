import { pool } from "@/db";

/** Un sujet ouvert sans réponse validée ni relance depuis ce délai passe « oublié ». */
export const DELAI_OUBLI_JOURS = 7;
/** Délai minimal entre deux relances d'un sujet encore actif. */
export const DELAI_RELANCE_HEURES = 24;

export type Etat = "ouvert" | "resolu" | "oublie";
export type TypeSujet = "question" | "recherche_api";
export type Tri = "recents" | "bientot-oublies";

/** L'état affiché est calculé à la lecture : rien à mettre à jour en tâche de fond. */
export const SQL_ETAT = `case when s.statut = 'resolu' then 'resolu'
  when s.relance_at < now() - interval '${DELAI_OUBLI_JOURS} days' then 'oublie'
  else 'ouvert' end`;

export const NOMS_ETAT: Record<Etat, string> = { ouvert: "Ouvert", resolu: "Résolu", oublie: "Oublié" };
export const NOMS_TYPE: Record<TypeSujet, string> = { question: "Question", recherche_api: "Je cherche une API" };

export type LigneSujet = {
  id: string; type: TypeSujet; titre: string; extrait: string; categorie: string | null;
  etat: Etat; auteur: string; pays: string; created_at: Date; relance_at: Date; activite_at: Date;
  nb_relances: number; nb_reponses: number; jours_restants: number;
};

export async function listerSujets(f: { etat?: string; type?: string; q?: string; tri?: Tri }): Promise<LigneSujet[]> {
  const etat = ["ouvert", "resolu", "oublie"].includes(f.etat ?? "") ? f.etat! : null;
  const type = ["question", "recherche_api"].includes(f.type ?? "") ? f.type! : null;
  const q = f.q?.trim() || null;
  // « Bientôt oubliés » : les sujets ouverts dont la relance est la plus ancienne passent en premier
  const ordre = f.tri === "bientot-oublies"
    ? "(case when s.etat = 'ouvert' then 0 else 1 end), s.relance_at asc"
    : "s.activite_at desc";
  const { rows } = await pool.query<LigneSujet>(
    `select * from (
       select s.id, s.type, s.titre, left(s.corps, 180) as extrait, s.categorie, ${SQL_ETAT} as etat,
              d.name as auteur, d.country as pays, s.created_at, s.relance_at, s.nb_relances,
              (select count(*)::int from forum_reponses r where r.sujet_id = s.id and r.supprime_at is null) as nb_reponses,
              greatest(s.relance_at, coalesce((select max(r.created_at) from forum_reponses r
                where r.sujet_id = s.id and r.supprime_at is null), s.relance_at)) as activite_at,
              greatest(0, ceil(extract(epoch from (s.relance_at + interval '${DELAI_OUBLI_JOURS} days' - now())) / 86400))::int as jours_restants
       from forum_sujets s join devs d on d.id = s.auteur_dev_id
       where s.supprime_at is null
         and ($2::text is null or s.type = $2)
         and ($3::text is null or s.titre ilike '%' || $3 || '%' or s.corps ilike '%' || $3 || '%')
     ) s
     where ($1::text is null or s.etat = $1)
     order by ${ordre}
     limit 100`,
    [etat, type, q],
  );
  return rows;
}

export async function compterEtats(): Promise<Record<Etat, number>> {
  const { rows } = await pool.query<{ etat: Etat; n: number }>(
    `select ${SQL_ETAT} as etat, count(*)::int as n from forum_sujets s where s.supprime_at is null group by 1`,
  );
  const c: Record<Etat, number> = { ouvert: 0, resolu: 0, oublie: 0 };
  for (const r of rows) c[r.etat] = r.n;
  return c;
}

/** « il y a 3 h », « il y a 2 j » */
export function ilYa(d: Date): string {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return `il y a ${Math.floor(s / 86400)} j`;
}

export const classeEtat: Record<Etat, string> = {
  ouvert: "border-blue-200 bg-blue-50 text-blue-800",
  resolu: "border-green-200 bg-green-50 text-green-800",
  oublie: "border-amber-200 bg-amber-50 text-amber-800",
};
