import { pool } from "@/db";
import { fcfa } from "@/lib/stats";

export const dynamic = "force-dynamic";

type Ligne = {
  slug: string; name: string; description: string; category: string; countries: string;
  price_fcfa: number; prise_slug: string | null; owner: string; owner_country: string; appels: string;
};

async function getApis(): Promise<Ligne[]> {
  try {
    const { rows } = await pool.query<Ligne>(`
      select a.slug, a.name, a.description, a.category, a.countries, a.price_fcfa, a.prise_slug,
             d.name as owner, d.country as owner_country,
             (select count(*) from calls c where c.api_id = a.id and c.billed) as appels
      from apis a join devs d on d.id = a.owner_dev_id
      where a.is_active
      order by a.category, a.name`);
    return rows;
  } catch {
    return [];
  }
}

export default async function Catalogue() {
  const apis = await getApis();

  return (
    <div className="py-10">
      <h1 className="text-2xl font-semibold">Catalogue</h1>
      <p className="mt-1 text-muted">{apis.length} API disponibles avec une seule clé SystaBokk.</p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {apis.map((a) => (
          <li key={a.slug} className="rounded-xl border border-line bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted">{a.category}</p>
                <h2 className="font-semibold">{a.name}</h2>
              </div>
              <span className="shrink-0 rounded-md bg-accent-soft px-2 py-1 text-sm font-medium text-accent">
                {fcfa(a.price_fcfa)} / appel
              </span>
            </div>
            <p className="mt-2 text-sm text-muted">{a.description}</p>
            <p className="mt-3 text-xs text-muted">
              Par {a.owner} ({a.owner_country}) · {a.countries.split(",").join(", ")} ·{" "}
              {Number(a.appels).toLocaleString("fr-FR")} appel{Number(a.appels) > 1 ? "s" : ""}
            </p>
            <code className="mt-3 block overflow-x-auto rounded-md bg-background p-2 text-xs">
              {a.prise_slug ? `/v1/prises/${a.prise_slug}/paiements` : `/v1/apis/${a.slug}`}
            </code>
            {a.prise_slug && (
              <p className="mt-2 text-xs text-accent">Prise standard « {a.prise_slug} » · bascule automatique</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
