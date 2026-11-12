import Link from "next/link";
import { pool } from "@/db";
import { devConnecte } from "@/lib/session";
import { FormPublier } from "@/components/form-publier";
import { bouton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Publier() {
  const dev = await devConnecte();
  const { rows: prises } = await pool.query<{ slug: string; name: string }>("select slug, name from prises order by name");

  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="text-2xl font-semibold">Publier une API</h1>
      <p className="mt-1 text-muted">
        Tout type d&apos;API : paiement, SMS, traduction, cartes, données, documents… Vous fixez le prix, vous touchez
        75 % de chaque appel.
      </p>
      <div className="mt-6">
        {dev && !dev.estJury ? (
          <FormPublier prises={prises} />
        ) : (
          <div data-guide="pub-compte" className="rounded-xl border border-line bg-card p-5">
            <p>{dev?.estJury ? "Le Pass Jury sert à essayer les API. Pour publier, créez un compte." : "Il faut un compte pour publier."}</p>
            <div className="mt-4 flex gap-3">
              <Link href="/inscription" className={bouton}>Créer un compte</Link>
              {!dev && <Link href="/espace" className="rounded-lg border border-line px-4 py-2.5">J&apos;ai déjà une clé</Link>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
