import Link from "next/link";
import { pool } from "@/db";
import { fcfa } from "@/lib/stats";
import { CATEGORIES, nomCategorie } from "@/lib/categories";

export const dynamic = "force-dynamic";

type Ligne = {
  slug: string; name: string; description: string; category: string; countries: string;
  price_fcfa: number; prise_slug: string | null; owner: string; owner_country: string; appels: string;
};

async function getApis(categorie?: string, q?: string): Promise<Ligne[]> {
  try {
    const { rows } = await pool.query<Ligne>(
      `select a.slug, a.name, a.description, a.category, a.countries, a.price_fcfa, a.prise_slug,
              d.name as owner, d.country as owner_country,
              (select count(*) from calls c where c.api_id = a.id and c.billed) as appels
       from apis a join devs d on d.id = a.owner_dev_id
       where a.is_active
         and ($1::text is null or a.category = $1)
         and ($2::text is null or a.name ilike '%' || $2 || '%' or a.description ilike '%' || $2 || '%')
       order by a.category, a.name`,
      [categorie || null, q || null],
    );
    return rows;
  } catch {
    return [];
  }
}

async function getCompteParCategorie(): Promise<Record<string, number>> {
  try {
    const { rows } = await pool.query<{ category: string; n: string }>(
      "select category, count(*) as n from apis where is_active group by category",
    );
    return Object.fromEntries(rows.map((r) => [r.category, Number(r.n)]));
  } catch {
    return {};
  }
}

export default async function Catalogue({ searchParams }: { searchParams: Promise<{ categorie?: string; q?: string }> }) {
  const { categorie, q } = await searchParams;
  const [apis, comptes] = await Promise.all([getApis(categorie, q), getCompteParCategorie()]);
  const total = Object.values(comptes).reduce((a, b) => a + b, 0);
  const chip = (actif: boolean) =>
    `rounded-full border px-3 py-1 text-sm ${actif ? "border-accent bg-accent-soft font-medium text-accent" : "border-line bg-card hover:border-accent"}`;

  return (
    <div className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Catalogue</h1>
          <p className="mt-1 text-muted">{total} API de tous types, avec une seule clé SystaBokk.</p>
        </div>
        <form className="flex gap-2">
          {categorie && <input type="hidden" name="categorie" value={categorie} />}
          <input data-guide="cat-recherche" name="q" defaultValue={q} placeholder="Rechercher…" className="rounded-lg border border-line bg-card px-3 py-2 text-sm" />
        </form>
      </div>

      <div data-guide="cat-filtres" className="mt-5 flex flex-wrap gap-2">
        <Link href="/catalogue" className={chip(!categorie)}>Toutes</Link>
        {CATEGORIES.filter((c) => comptes[c.slug]).map((c) => (
          <Link key={c.slug} href={`/catalogue?categorie=${c.slug}`} className={chip(categorie === c.slug)}>
            {c.nom} <span className="text-muted">{comptes[c.slug]}</span>
          </Link>
        ))}
      </div>

      {apis.length === 0 && <p className="mt-8 text-muted">Aucune API ne correspond.</p>}
      <ul data-guide="cat-liste" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {apis.map((a) => (
          <li key={a.slug}>
            <Link href={`/catalogue/${a.slug}`} className="block h-full rounded-xl border border-line bg-card p-5 hover:border-accent">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">{nomCategorie(a.category)}</p>
                  <h2 className="font-semibold">{a.name}</h2>
                </div>
                <span data-guide="cat-prix" className="shrink-0 rounded-md bg-accent-soft px-2 py-1 text-sm font-medium text-accent">
                  {fcfa(a.price_fcfa)} / appel
                </span>
              </div>
              <p className="mt-2 text-sm text-muted">{a.description}</p>
              <p className="mt-3 text-xs text-muted">
                Par {a.owner} ({a.owner_country}) · {a.countries.split(",").join(", ")} ·{" "}
                {Number(a.appels).toLocaleString("fr-FR")} appel{Number(a.appels) > 1 ? "s" : ""}
              </p>
              {a.prise_slug && (
                <p data-guide="cat-prise" className="mt-2 text-xs text-accent">Prise standard « {a.prise_slug} » · bascule automatique</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
