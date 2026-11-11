import Link from "next/link";
import { fcfa, getStats } from "@/lib/stats";
import { CATEGORIES } from "@/lib/categories";
import { HeroAnime } from "@/components/hero-anime";

export const dynamic = "force-dynamic";

export default async function Accueil() {
  const s = await getStats();

  return (
    <div className="py-10 sm:py-16">
      <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.05fr]">
      <div>
      <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
        Ton code peut <span className="text-accent">te payer.</span>
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted">
        Publie ton API une fois. Chaque fois qu&apos;un développeur — ou une IA — l&apos;utilise, tu gagnes des FCFA.
        Une seule clé pour toutes les API d&apos;Afrique, hébergées à Dakar.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/catalogue" className="rounded-lg bg-accent px-5 py-3 font-medium text-white hover:opacity-90">
          Explorer les API
        </Link>
        <Link href="/publier" className="rounded-lg border border-line bg-card px-5 py-3 font-medium hover:border-accent">
          Publier mon API
        </Link>
        <Link href="/jury" className="px-2 py-3 text-sm text-muted underline hover:text-accent">
          Essayer avec le Pass Jury
        </Link>
      </div>
      </div>
      <HeroAnime />
      </div>

      <dl className="mt-12 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="API publiées" value={s.apis.toLocaleString("fr-FR")} />
        <Stat label="Devs inscrits" value={s.devs.toLocaleString("fr-FR")} />
        <Stat label="Appels traités" value={s.appels.toLocaleString("fr-FR")} />
        <Stat label="Versé aux créateurs" value={fcfa(s.gainsCreateurs)} accent />
      </dl>
      <p className="mt-2 text-xs text-muted">Chiffres réels de la plateforme · paiements en mode test.</p>

      <Link href="/agents" className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent bg-accent-soft p-5 hover:opacity-90">
        <div>
          <p className="text-sm font-medium text-accent">Nouveau · MCP</p>
          <p className="mt-1 font-semibold">Les agents IA aussi paient à l&apos;appel : branchez Claude ou Cursor sur SystaBokk.</p>
        </div>
        <span className="text-sm font-medium text-accent">Découvrir →</span>
      </Link>

      <section className="mt-16">
        <h2 className="text-lg font-semibold">Tout type d&apos;API</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.filter((c) => c.slug !== "autre").map((c) => (
            <Link key={c.slug} href={`/catalogue?categorie=${c.slug}`} className="rounded-xl border border-line bg-card p-3 hover:border-accent">
              <p className="text-sm font-medium">{c.nom}</p>
              <p className="mt-0.5 text-xs text-muted">{c.exemple}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        <Etape n="1" titre="Publie" texte="Ton API tourne sur Systalink. Tu fixes ton prix par appel, en FCFA." />
        <Etape n="2" titre="On l'appelle" texte="Les devs l'utilisent avec leur clé SystaBokk, sans contrat ni intégration de paiement." />
        <Etape n="3" titre="Tu gagnes" texte="Chaque appel crédite ton portefeuille. Retrait Mobile Money ou crédits Systalink." />
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${accent ? "border-accent bg-accent-soft" : "border-line bg-card"}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">{value}</dd>
    </div>
  );
}

function Etape({ n, titre, texte }: { n: string; titre: string; texte: string }) {
  return (
    <div>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-soft font-semibold text-accent">{n}</div>
      <h2 className="mt-3 font-semibold">{titre}</h2>
      <p className="mt-1 text-sm text-muted">{texte}</p>
    </div>
  );
}
