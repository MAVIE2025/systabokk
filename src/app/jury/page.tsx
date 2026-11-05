import Link from "next/link";
import { devConnecte } from "@/lib/session";
import { fcfa } from "@/lib/stats";
import { pannes } from "@/lib/demo/pannes";
import { basculerPanneDemo, entrerJury } from "@/app/actions";
import { bouton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Jury({ searchParams }: { searchParams: Promise<{ indisponible?: string }> }) {
  const { indisponible } = await searchParams;
  const dev = await devConnecte();

  if (!dev?.estJury) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <p className="text-sm font-medium text-accent">Pour le jury et les visiteurs</p>
        <h1 className="mt-2 text-3xl font-semibold">Pass Jury</h1>
        <p className="mt-3 text-lg text-muted">
          Un compte de démonstration déjà crédité en FCFA de test. Un clic, et vous appelez vous-même de vraies API
          à travers la passerelle SystaBokk.
        </p>
        {indisponible && <p className="mt-4 text-sm text-red-700">Le Pass Jury n&apos;est pas configuré sur ce serveur.</p>}
        <form action={entrerJury} className="mt-6"><button className={bouton}>Entrer avec le Pass Jury</button></form>
      </div>
    );
  }

  const Panne = ({ cle, titre }: { cle: string; titre: string }) => {
    const enPanne = pannes.has(cle);
    return (
      <form action={basculerPanneDemo.bind(null, cle)} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-card p-4">
        <div>
          <p className="font-medium">{titre}</p>
          <p className={`text-sm ${enPanne ? "text-red-700" : "text-green-800"}`}>{enPanne ? "● En panne (simulée)" : "● En service"}</p>
        </div>
        <button className="rounded-lg border border-line px-3 py-2 text-sm hover:border-accent">
          {enPanne ? "Rétablir" : "Couper"}
        </button>
      </form>
    );
  };

  return (
    <div className="py-10">
      <h1 className="text-2xl font-semibold">Bienvenue, membre du jury</h1>
      <p className="mt-1 text-muted">Solde de démonstration : <b>{fcfa(dev.balance)}</b> (FCFA de test, aucun argent réel).</p>

      <ol className="mt-8 space-y-6">
        <li>
          <h2 className="font-semibold">1. Appelez une API</h2>
          <p className="mt-1 text-sm text-muted">Ouvrez une fiche et cliquez sur « Essayer » : l&apos;appel est réel, il est facturé et le créateur est payé.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {[["montant-en-lettres", "Montant en lettres"], ["qrcode", "QR code"], ["devises", "FCFA ↔ euro"], ["telephone", "Validation de numéro"]].map(([s, n]) => (
              <Link key={s} href={`/catalogue/${s}`} className="rounded-full border border-line bg-card px-3 py-1 hover:border-accent">{n}</Link>
            ))}
          </div>
        </li>
        <li>
          <h2 className="font-semibold">2. Provoquez une panne</h2>
          <p className="mt-1 text-sm text-muted">
            Coupez le fournisseur A, puis essayez la prise : la passerelle bascule seule sur B, et seul B est facturé.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Panne cle="paiement-a" titre="Paiement mobile — Fournisseur A" />
            <Panne cle="sms-a" titre="SMS — Fournisseur A" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            <Link href="/catalogue/paiement-a" className="rounded-full border border-line bg-card px-3 py-1 hover:border-accent">Essayer la prise Paiement</Link>
            <Link href="/catalogue/sms-a" className="rounded-full border border-line bg-card px-3 py-1 hover:border-accent">Essayer la prise SMS</Link>
          </div>
        </li>
        <li>
          <h2 className="font-semibold">3. Regardez l&apos;argent circuler</h2>
          <p className="mt-1 text-sm text-muted">
            L&apos;<Link href="/" className="text-accent underline">accueil</Link> affiche en direct les appels traités et les FCFA versés aux créateurs.
          </p>
        </li>
      </ol>
    </div>
  );
}
