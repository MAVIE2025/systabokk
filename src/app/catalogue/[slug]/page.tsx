import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { pool } from "@/db";
import { fcfa } from "@/lib/stats";
import { nomCategorie } from "@/lib/categories";
import { devConnecte } from "@/lib/session";
import { Essayer } from "@/components/essayer";

export const dynamic = "force-dynamic";

type Fiche = {
  id: string; slug: string; name: string; description: string; category: string; countries: string;
  price_fcfa: number; prise_slug: string | null; prise_name: string | null; prise_description: string | null;
  doc_url: string | null; example_method: string; example_path: string; example_body: string | null;
  owner: string; owner_country: string;
};

export default async function FicheApi({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { rows } = await pool.query<Fiche>(
    `select a.id, a.slug, a.name, a.description, a.category, a.countries, a.price_fcfa, a.prise_slug,
            p.name as prise_name, p.description as prise_description, a.doc_url,
            a.example_method, a.example_path, a.example_body, d.name as owner, d.country as owner_country
     from apis a join devs d on d.id = a.owner_dev_id left join prises p on p.slug = a.prise_slug
     where a.slug = $1 and a.is_active`,
    [slug],
  );
  const a = rows[0];
  if (!a) notFound();

  // Fiabilité mesurée sur les vrais appels des 7 derniers jours
  const { rows: st } = await pool.query<{ total: string; ok: string; latence: string | null }>(
    `select count(*) as total, count(*) filter (where billed) as ok, round(avg(latency_ms) filter (where billed)) as latence
     from calls where api_id = $1 and created_at > now() - interval '7 days'`,
    [a.id],
  );
  const total = Number(st[0].total), ok = Number(st[0].ok);
  const dispo = total ? Math.round((ok / total) * 1000) / 10 : null;

  const { rows: autres } = a.prise_slug
    ? await pool.query<{ slug: string; name: string; price_fcfa: number }>(
        "select slug, name, price_fcfa from apis where prise_slug = $1 and is_active order by prise_priority",
        [a.prise_slug],
      )
    : { rows: [] };

  const dev = await devConnecte();
  const h = await headers();
  const base = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}`;
  const chemin = (a.prise_slug ? `/v1/prises/${a.prise_slug}` : `/v1/apis/${a.slug}`) + a.example_path;
  const curl = [
    `curl ${a.example_method === "GET" ? "" : `-X ${a.example_method} `}"${base}${chemin}" \\`,
    `  -H "Authorization: Bearer VOTRE_CLE"${a.example_body ? " \\" : ""}`,
    ...(a.example_body ? [`  -H "content-type: application/json" \\`, `  -d '${JSON.stringify(JSON.parse(a.example_body))}'`] : []),
  ].join("\n");

  return (
    <div className="py-10">
      <Link href="/catalogue" className="text-sm text-muted hover:text-accent">← Catalogue</Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{nomCategorie(a.category)}</p>
          <h1 className="text-2xl font-semibold">{a.name}</h1>
          <p className="mt-2 max-w-2xl text-muted">{a.description}</p>
          <p className="mt-2 text-sm text-muted">
            Par {a.owner} ({a.owner_country}) · {a.countries.split(",").join(", ")}
            {a.doc_url && <> · <a href={a.doc_url} className="text-accent underline" rel="noopener noreferrer" target="_blank">Documentation</a></>}
          </p>
        </div>
        <div className="rounded-xl border border-accent bg-accent-soft px-4 py-3 text-right">
          <p className="text-xs text-muted">Prix par appel</p>
          <p className="text-2xl font-semibold">{fcfa(a.price_fcfa)}</p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-xs text-muted">Appels (7 jours)</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{total.toLocaleString("fr-FR")}</p>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-xs text-muted">Taux de réussite</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{dispo === null ? "—" : `${dispo.toLocaleString("fr-FR")} %`}</p>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-xs text-muted">Temps de réponse moyen</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{st[0].latence ? `${st[0].latence} ms` : "—"}</p>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">Mesuré sur les vrais appels passés par la passerelle.</p>

      {a.prise_slug && (
        <section className="mt-8 rounded-xl border border-line bg-card p-5">
          <h2 className="font-semibold">Prise standard « {a.prise_name} »</h2>
          <p className="mt-1 text-sm text-muted">{a.prise_description}</p>
          <p className="mt-3 text-sm">Fournisseurs, dans l&apos;ordre de bascule :</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {autres.map((o) => (
              <li key={o.slug}><Link href={`/catalogue/${o.slug}`} className="hover:text-accent">{o.name}</Link> · {fcfa(o.price_fcfa)}</li>
            ))}
          </ol>
        </section>
      )}

      <section className="mt-8">
        <h2 className="font-semibold">Appeler cette API</h2>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-[#1c1917] p-4 text-xs text-[#f3efe9]">{curl}</pre>
      </section>

      <section className="mt-8">
        <h2 className="mb-3 font-semibold">Essayer maintenant</h2>
        <Essayer slug={a.slug} connecte={!!dev} />
      </section>
    </div>
  );
}
