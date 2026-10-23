import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "SystaBokk — la bourse des API africaines",
  description: "Publie ton API, gagne des FCFA à chaque appel. Une clé, toutes les API d'Afrique, hébergées à Dakar.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">
        <header className="border-b border-line">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-lg font-semibold tracking-tight">
              Systa<span className="text-accent">Bokk</span>
            </Link>
            <div className="flex gap-5 text-sm">
              <Link href="/catalogue" className="hover:text-accent">Catalogue</Link>
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
