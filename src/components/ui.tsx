// Petits composants d'interface partagés
export const champ =
  "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent";
export const bouton =
  "rounded-lg bg-accent px-4 py-2.5 font-medium text-white hover:opacity-90 disabled:opacity-50";
export const boutonSecondaire =
  "rounded-lg border border-line bg-card px-4 py-2.5 font-medium hover:border-accent";

export function Etiquette({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium">
      {children}
    </label>
  );
}

export function Erreur({ texte }: { texte?: string }) {
  if (!texte) return null;
  return <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{texte}</p>;
}
