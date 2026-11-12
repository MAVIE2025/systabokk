import type { Metadata } from "next";
import Link from "next/link";
import { devConnecte } from "@/lib/session";
import { fcfa } from "@/lib/stats";
import { deconnecter } from "@/app/actions";
import "./globals.css";

export const metadata: Metadata = {
  title: "SystaBokk — la bourse des API africaines",
  description: "Publie ton API, gagne des FCFA à chaque appel. Une clé, toutes les API d'Afrique, hébergées à Dakar.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const dev = await devConnecte();
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        <header className="border-b border-line">
          <nav className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-5 gap-y-2 px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              <span className="text-accent">Systa</span><span className="text-ocre">Bokk</span>
            </Link>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <Link href="/" className="hover:text-accent">Accueil</Link>
              <Link href="/catalogue" className="hover:text-accent">Catalogue</Link>
              <Link href="/publier" className="hover:text-accent">Publier</Link>
              <Link href="/agents" className="hover:text-accent">Agents IA</Link>
              <Link href="/jury" className="hover:text-accent">Pass Jury</Link>
              {dev ? (
                <>
                  <Link href="/espace" className="rounded-md bg-accent-soft px-2 py-1 font-medium text-accent">
                    Mon compte · {fcfa(dev.balance)}
                  </Link>
                  <form action={deconnecter}>
                    <button type="submit" className="hover:text-accent">Me déconnecter</button>
                  </form>
                </>
              ) : (
                <Link href="/espace" className="hover:text-accent">Mon compte</Link>
              )}
              <a href="https://systalink.com" target="_blank" rel="noopener noreferrer"
                className="rounded-md border border-accent px-2 py-1 font-medium text-accent hover:bg-accent hover:text-white">
                Produits Systalink ↗
              </a>
            </div>
          </nav>
        </header>
        <main className="mx-auto max-w-5xl px-4">{children}</main>
        <footer className="mx-auto max-w-5xl px-4 py-10 text-xs text-muted">
          Projet CADEV 2026 · hébergé sur Systalink Datacloud, Dakar · paiements en mode test
        </footer>
      </body>
    </html>
  );
}
