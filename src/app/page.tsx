import Link from "next/link";
import { fcfa, getStats } from "@/lib/stats";
import { HeroAnime } from "@/components/hero-anime";
import { VideoBouton } from "@/components/video-bouton";

export const dynamic = "force-dynamic";

export default async function Accueil() {
  const s = await getStats();

  return (
    <div className="flex min-h-[calc(100vh-7.5rem)] flex-col justify-center pb-16 pt-6">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.05fr] xl:gap-20">
      <div>
      <h1 data-guide="accueil-titre" className="text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl xl:text-7xl 2xl:text-8xl">
        Ton code peut <span className="text-accent">te payer.</span>
      </h1>
      <p className="mt-4 max-w-2xl text-lg text-muted xl:text-xl">
        Publie ton API une fois. Chaque fois qu&apos;un développeur — ou une IA — l&apos;utilise, tu gagnes des FCFA.
        Une seule clé pour toutes les API d&apos;Afrique, hébergées à Dakar.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/catalogue" data-guide="accueil-explorer" className="rounded-lg bg-accent px-5 py-3 font-medium text-white hover:opacity-90">
          Explorer les API
        </Link>
        <Link href="/publier" data-guide="accueil-publier" className="rounded-lg border border-line bg-card px-5 py-3 font-medium hover:border-accent">
          Publier mon API
        </Link>
        <Link href="/jury" data-guide="accueil-jury" className="px-2 py-3 text-sm text-muted underline hover:text-accent">
          Essayer avec le Pass Jury
        </Link>
      </div>
      <div className="mt-4"><VideoBouton /></div>
      </div>
      <HeroAnime />
      </div>

      <dl data-guide="accueil-chiffres" className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="API publiées" value={s.apis.toLocaleString("fr-FR")} />
        <Stat label="Devs inscrits" value={s.devs.toLocaleString("fr-FR")} />
        <Stat label="Appels traités" value={s.appels.toLocaleString("fr-FR")} />
        <Stat label="Versé aux créateurs" value={fcfa(s.gainsCreateurs)} accent />
      </dl>
      <p className="mt-2 text-xs text-muted">Chiffres réels de la plateforme · paiements en mode test.</p>

      <Link href="/agents" data-guide="accueil-mcp" className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent bg-accent-soft p-5 hover:opacity-90">
        <div>
          <p className="text-sm font-medium text-accent">Nouveau · MCP</p>
          <p className="mt-1 font-semibold">Les agents IA aussi paient à l&apos;appel : branchez Claude ou Cursor sur SystaBokk.</p>
        </div>
        <span className="text-sm font-medium text-accent">Découvrir →</span>
      </Link>

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
