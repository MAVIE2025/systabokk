import type { Metadata } from "next";
import Link from "next/link";
import { devConnecte } from "@/lib/session";
import { fcfa } from "@/lib/stats";
import { deconnecter } from "@/app/actions";
import { Guide } from "@/components/guide";
import { NavOnglets } from "@/components/nav-onglets";
import "./globals.css";

export const metadata: Metadata = {
  title: "SystaBokk — la bourse des API africaines",
  description: "Publie ton API, gagne des FCFA à chaque appel. Une clé, toutes les API d'Afrique, hébergées à Dakar.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const dev = await devConnecte();
  return (
    <html lang="fr">
      <body className="flex min-h-screen flex-col antialiased">
        <header className="border-b border-line">
          <nav className="mx-auto flex w-full px-4 sm:px-8 lg:px-12 2xl:px-20 flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3">
            <Link href="/" data-guide="nav-logo" className="text-lg font-semibold tracking-tight">
              <span className="text-accent">Systa</span><span className="text-ocre">Bokk</span>
            </Link>
            <NavOnglets
              connecte={!!dev}
              estAdmin={!!dev?.estAdmin}
              solde={dev ? fcfa(dev.balance) : null}
              deconnecter={deconnecter}
            />
            <a href="https://systalink.com" data-guide="nav-systalink" target="_blank" rel="noopener noreferrer"
              className="rounded-full border border-accent px-4 py-1.5 text-sm font-medium whitespace-nowrap text-accent shadow-sm transition hover:bg-accent hover:text-white lg:text-base">
              Produits Systalink ↗
            </a>
          </nav>
        </header>
        <main className="mx-auto w-full px-4 sm:px-8 lg:px-12 2xl:px-20 flex-1">{children}</main>
        <footer className="mx-auto w-full px-4 sm:px-8 lg:px-12 2xl:px-20 py-6 text-xs text-muted">
          Projet CADEV 2026 · hébergé sur Systalink Datacloud, Dakar · paiements en mode test
        </footer>
        <Guide connecte={!!dev} />
      </body>
    </html>
  );
}
