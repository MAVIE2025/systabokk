import Link from "next/link";
import { pool } from "@/db";
import { devConnecte } from "@/lib/session";
import { fcfa } from "@/lib/stats";
import { nomCategorie } from "@/lib/categories";
import { deconnecter, rechargerTest } from "@/app/actions";
import { FormConnexion } from "@/components/form-connexion";
import { bouton, boutonSecondaire } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Espace() {
  const dev = await devConnecte();

  if (!dev) {
    return (
      <div className="mx-auto grid max-w-3xl gap-8 py-10 sm:grid-cols-2">
        <div>
          <h1 className="text-2xl font-semibold">Mon espace</h1>
          <p className="mt-1 text-muted">Connectez-vous avec la clé reçue à l&apos;inscription.</p>
          <div className="mt-6"><FormConnexion /></div>
        </div>
        <div className="rounded-xl border border-line bg-card p-5">
          <h2 className="font-semibold">Pas encore de compte ?</h2>
          <p className="mt-1 text-sm text-muted">Créez-le en 30 secondes : nom, e-mail, pays.</p>
          <Link href="/inscription" className={`mt-4 inline-block ${bouton}`}>Créer un compte</Link>
        </div>
      </div>
    );
  }

  const { rows: apis } = await pool.query<{
    slug: string; name: string; category: string; price_fcfa: number; appels: string; gains: string;
  }>(
    `select a.slug, a.name, a.category, a.price_fcfa,
            (select count(*) from calls c where c.api_id = a.id and c.billed) as appels,
            (select coalesce(sum(l.amount_fcfa), 0) from ledger l join calls c on c.id = l.call_id
              where c.api_id = a.id and l.kind = 'revenu') as gains
     from apis a where a.owner_dev_id = $1 order by a.created_at desc`,
    [dev.id],
  );
  const { rows: depenses } = await pool.query<{ n: string; total: string }>(
    "select count(*) as n, coalesce(sum(price_fcfa), 0) as total from calls where consumer_dev_id = $1 and billed",
    [dev.id],
  );

  return (
    <div className="py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Bonjour {dev.name}</h1>
          <p className="text-muted">Clé : {dev.cle.slice(0, 13)}… · {dev.country}</p>
        </div>
        <form action={deconnecter}><button className="text-sm text-muted underline">Se déconnecter</button></form>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-accent bg-accent-soft p-4">
          <p className="text-xs text-muted">Solde du portefeuille</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{fcfa(dev.balance)}</p>
          {!dev.estJury && (
            <form action={rechargerTest} className="mt-3">
              <button className="text-sm font-medium text-accent underline">+ Recharger 2 000 FCFA (test)</button>
            </form>
          )}
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-xs text-muted">Gagné avec mes API</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{fcfa(dev.earned)}</p>
          <p className="mt-3 text-xs text-muted">Retrait Mobile Money ou crédits Systalink (bientôt)</p>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-xs text-muted">Mes appels</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{Number(depenses[0].n).toLocaleString("fr-FR")}</p>
          <p className="mt-3 text-xs text-muted">{fcfa(Number(depenses[0].total))} dépensés</p>
        </div>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Mes API publiées</h2>
        {!dev.estJury && <Link href="/publier" className={bouton}>Publier une API</Link>}
      </div>
      {apis.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-line p-6 text-center text-muted">
          Aucune API publiée pour l&apos;instant.{" "}
          {!dev.estJury && <Link href="/publier" className="text-accent underline">Publiez la première</Link>}
        </p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-card">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted">
              <tr><th className="p-3">API</th><th className="p-3">Catégorie</th><th className="p-3 text-right">Prix</th><th className="p-3 text-right">Appels</th><th className="p-3 text-right">Gains</th></tr>
            </thead>
            <tbody>
              {apis.map((a) => (
                <tr key={a.slug} className="border-t border-line">
                  <td className="p-3"><Link href={`/catalogue/${a.slug}`} className="font-medium hover:text-accent">{a.name}</Link></td>
                  <td className="p-3 text-muted">{nomCategorie(a.category)}</td>
                  <td className="p-3 text-right tabular-nums">{fcfa(a.price_fcfa)}</td>
                  <td className="p-3 text-right tabular-nums">{Number(a.appels).toLocaleString("fr-FR")}</td>
                  <td className="p-3 text-right font-medium tabular-nums">{fcfa(Number(a.gains))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Link href="/catalogue" className={`mt-8 inline-block ${boutonSecondaire}`}>Explorer le catalogue</Link>
    </div>
  );
}
