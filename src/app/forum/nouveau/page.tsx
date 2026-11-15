import Link from "next/link";
import { devConnecte } from "@/lib/session";
import { FormSujet } from "@/components/forum-formulaires";
import { bouton, boutonSecondaire } from "@/components/ui";
import { entrerJury } from "@/app/actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Poser une question · SystaBokk" };

export default async function NouveauSujet({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type } = await searchParams;
  const dev = await devConnecte();
  return (
    <div className="mx-auto max-w-2xl py-10">
      <Link href="/forum" className="text-sm text-accent">← Forum</Link>
      <h1 className="mt-2 text-2xl font-semibold">Poser une question</h1>
      {!dev ? (
        <div className="mt-6 rounded-xl border border-line bg-card p-5">
          <p>Pour publier sur le forum, connectez-vous avec votre clé SystaBokk ou entrez avec le Pass Jury.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/espace" className={bouton}>Me connecter</Link>
            <form action={entrerJury}><button className={boutonSecondaire}>Entrer avec le Pass Jury</button></form>
          </div>
        </div>
      ) : (
        <div className="mt-6"><FormSujet typeInitial={type === "recherche_api" ? "recherche_api" : "question"} /></div>
      )}
    </div>
  );
}
