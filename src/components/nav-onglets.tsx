"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Onglets centraux du menu : boutons flottants arrondis, l'onglet de la page courante est plein. */
export function NavOnglets({
  connecte, estAdmin, solde, deconnecter,
}: {
  connecte: boolean;
  estAdmin: boolean;
  solde: string | null;
  deconnecter: () => Promise<void>;
}) {
  const chemin = usePathname();
  const actif = (href: string) => (href === "/" ? chemin === "/" : chemin === href || chemin.startsWith(href + "/"));
  const pastille = (href: string, ocre = false) => {
    const base = "rounded-full px-4 py-1.5 font-medium whitespace-nowrap shadow-sm transition hover:-translate-y-0.5 hover:shadow-md";
    if (ocre) return `${base} ${actif(href) ? "bg-ocre text-white" : "border border-orange-200 bg-orange-50 text-ocre hover:bg-ocre hover:text-white"}`;
    return `${base} ${actif(href) ? "bg-accent text-white shadow-md" : "border border-blue-100 bg-accent-soft text-accent hover:bg-accent hover:text-white"}`;
  };
  const onglets = [
    { href: "/", nom: "Accueil", guide: "nav-accueil" },
    { href: "/catalogue", nom: "Catalogue", guide: "nav-catalogue" },
    { href: "/publier", nom: "Publier", guide: "nav-publier" },
    { href: "/agents", nom: "Agents IA", guide: "nav-agents" },
    { href: "/jury", nom: "Pass Jury", guide: "nav-jury" },
  ];
  return (
    <div className="order-last flex w-full flex-wrap items-center justify-center gap-2 text-sm lg:order-none lg:w-auto lg:flex-1 lg:text-base">
      {onglets.map((o) => (
        <Link key={o.href} href={o.href} data-guide={o.guide} className={pastille(o.href)}>{o.nom}</Link>
      ))}
      {estAdmin && <Link href="/admin" data-guide="nav-admin" className={pastille("/admin", true)}>Admin</Link>}
      <Link href="/espace" data-guide="nav-compte" className={pastille("/espace")}>
        Mon compte{solde ? ` · ${solde}` : ""}
      </Link>
      {connecte && (
        <form action={deconnecter}>
          <button type="submit" data-guide="nav-deconnexion"
            className="rounded-full border border-line bg-card px-4 py-1.5 font-medium whitespace-nowrap text-muted shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:text-accent hover:shadow-md">
            Me déconnecter
          </button>
        </form>
      )}
    </div>
  );
}
