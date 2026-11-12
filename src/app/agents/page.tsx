import Link from "next/link";
import { headers } from "next/headers";
import { pool } from "@/db";
import { devConnecte } from "@/lib/session";
import { OUTILS } from "@/lib/mcp";
import { fcfa } from "@/lib/stats";
import { bouton } from "@/components/ui";

export const dynamic = "force-dynamic";

const Code = ({ children }: { children: string }) => (
  <pre className="mt-2 overflow-x-auto rounded-xl bg-[#0f172a] p-4 text-xs text-[#e8edf7]">{children}</pre>
);

export default async function Agents() {
  const dev = await devConnecte();
  const h = await headers();
  const url = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host") ?? "localhost:3000"}/mcp`;
  const cle = dev ? dev.cle : "VOTRE_CLE_SYSTABOKK";
  const cleAffichee = dev ? `${dev.cle.slice(0, 13)}…` : "VOTRE_CLE_SYSTABOKK";

  let stats = { appels: 0, fcfa: 0 };
  try {
    const { rows } = await pool.query<{ n: string; total: string }>(
      "select count(*) as n, coalesce(sum(price_fcfa), 0) as total from calls where canal = 'mcp' and billed",
    );
    stats = { appels: Number(rows[0].n), fcfa: Number(rows[0].total) };
  } catch {}

  return (
    <div className="py-10">
      <p className="text-sm font-medium text-accent">Nouveau · MCP</p>
      <h1 className="mt-2 max-w-3xl text-3xl font-semibold leading-tight sm:text-4xl">
        Les agents IA aussi paient à l&apos;appel.
      </h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        Branchez Claude, Cursor ou votre propre agent sur SystaBokk : il trouve les API africaines dont il a besoin,
        les appelle et paie en FCFA avec votre clé. Chaque appel rémunère un développeur africain.
      </p>

      <div data-guide="ag-chiffres" className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-accent bg-accent-soft p-4">
          <p className="text-xs text-muted">Appels payés par des agents IA</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{stats.appels.toLocaleString("fr-FR")}</p>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-xs text-muted">FCFA dépensés par des agents</p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{fcfa(stats.fcfa)}</p>
        </div>
        <div className="rounded-xl border border-line bg-card p-4">
          <p className="text-xs text-muted">Adresse du serveur MCP</p>
          <p className="mt-1 break-all font-mono text-sm">{url}</p>
        </div>
      </div>

      <section data-guide="ag-outils" className="mt-10">
        <h2 className="text-lg font-semibold">Les outils que l&apos;agent reçoit</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {OUTILS.map((o) => (
            <div key={o.name} className="rounded-xl border border-line bg-card p-4">
              <p className="font-mono text-sm font-semibold">{o.name}</p>
              <p className="mt-1 text-sm text-muted">{o.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section data-guide="ag-config" className="mt-10 grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold">Claude Code</h2>
          <p className="mt-1 text-sm text-muted">Une commande dans le terminal :</p>
          <Code>{`claude mcp add --transport http systabokk ${url} \\\n  --header "Authorization: Bearer ${cle}"`}</Code>
        </div>
        <div>
          <h2 className="text-lg font-semibold">Cursor et autres clients MCP</h2>
          <p className="mt-1 text-sm text-muted">Dans le fichier de configuration MCP :</p>
          <Code>{JSON.stringify({ mcpServers: { systabokk: { url, headers: { Authorization: `Bearer ${cle}` } } } }, null, 2)}</Code>
        </div>
      </section>
      <p className="mt-3 text-sm text-muted">
        {dev
          ? <>Les exemples contiennent votre clé ({cleAffichee}). Ne la partagez pas : elle donne accès à votre portefeuille.</>
          : <>Remplacez VOTRE_CLE_SYSTABOKK par votre clé. <Link href="/inscription" className="text-accent underline">Créez un compte</Link> ou <Link href="/jury" className="text-accent underline">essayez avec le Pass Jury</Link>.</>}
      </p>

      <section data-guide="ag-exemple" className="mt-10 rounded-xl border border-line bg-card p-5">
        <h2 className="font-semibold">Exemple de conversation</h2>
        <div className="mt-3 space-y-3 text-sm">
          <p><b>Vous :</b> Écris en lettres 1 250 000 FCFA pour ma facture, puis envoie un SMS de confirmation au +226 70 12 34 56.</p>
          <p className="text-muted"><b className="text-foreground">Agent :</b> j&apos;appelle <span className="font-mono">montant-en-lettres</span> (4 FCFA) puis la prise <span className="font-mono">sms</span> (12 FCFA)…
            « un million deux cent cinquante mille francs CFA ». SMS envoyé via le fournisseur A. Total : 16 FCFA, dont 75 % pour les deux créateurs.</p>
        </div>
      </section>

      {!dev && (
        <div className="mt-8"><Link href="/jury" className={bouton}>Essayer avec le Pass Jury</Link></div>
      )}
    </div>
  );
}
