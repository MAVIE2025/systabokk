import Link from "next/link";
import { notFound } from "next/navigation";
import { pool } from "@/db";
import { devConnecte } from "@/lib/session";
import { fcfa } from "@/lib/stats";
import { nomCategorie } from "@/lib/categories";
import { soldePlateforme } from "@/lib/admin-donnees";
import { basculerAdmin, debloquerCompte, supprimerApi, suspendreApi } from "./actions";
import { BoutonConfirme } from "@/components/admin/bouton-confirme";
import { FormBlocage } from "@/components/admin/form-blocage";
import { ResetCle } from "@/components/admin/reset-cle";
import { FormRetrait } from "@/components/admin/form-retrait";

export const dynamic = "force-dynamic";
export const metadata = { title: "Espace admin · SystaBokk", robots: { index: false } };

const ONGLETS = [
  { cle: "apercu", nom: "Vue d'ensemble" },
  { cle: "comptes", nom: "Comptes" },
  { cle: "api", nom: "API" },
  { cle: "gains", nom: "Gains de la plateforme" },
  { cle: "journal", nom: "Journal" },
] as const;
type Onglet = (typeof ONGLETS)[number]["cle"];

const date = (d: Date) =>
  new Date(d).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
const n = (x: string | number) => Number(x).toLocaleString("fr-FR");

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ onglet?: string; q?: string }> }) {
  const dev = await devConnecte();
  if (!dev?.estAdmin) notFound(); // l'espace n'existe pas pour les autres
  const sp = await searchParams;
  const onglet: Onglet = (ONGLETS.find((o) => o.cle === sp.onglet)?.cle ?? "apercu") as Onglet;
  const q = (sp.q ?? "").trim().slice(0, 80);

  return (
    <div className="py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-ocre">Espace administrateur Systalink</p>
          <h1 className="text-3xl font-semibold">Tableau de bord</h1>
        </div>
        <p className="text-sm text-muted">Connecté : {dev.name} · chaque action est inscrite au journal</p>
      </div>

      <nav data-guide="adm-onglets" className="mt-6 flex flex-wrap gap-2 border-b border-line" aria-label="Sections admin">
        {ONGLETS.map((o) => (
          <Link key={o.cle} href={`/admin?onglet=${o.cle}`} data-guide={`adm-onglet-${o.cle}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${onglet === o.cle ? "border-accent text-accent" : "border-transparent text-muted hover:text-foreground"}`}>
            {o.nom}
          </Link>
        ))}
      </nav>

      <div className="mt-6">
        {onglet === "apercu" && <Apercu />}
        {onglet === "comptes" && <Comptes q={q} moi={dev.id} />}
        {onglet === "api" && <Apis q={q} />}
        {onglet === "gains" && <Gains />}
        {onglet === "journal" && <Journal />}
      </div>
    </div>
  );
}

/* ---------- Vue d'ensemble ---------- */

async function Apercu() {
  const { rows } = await pool.query<Record<string, string>>(
    `select
       (select count(*) from devs) as devs,
       (select count(*) from devs where blocked_at is not null) as bloques,
       (select count(*) from devs where created_at > now() - interval '7 days') as devs7,
       (select count(*) from apis where deleted_at is null and is_active) as apis,
       (select count(*) from apis where deleted_at is null and not is_active) as suspendues,
       (select count(*) from calls where billed) as appels,
       (select count(*) from calls where billed and created_at > now() - interval '24 hours') as appels24,
       (select count(*) from calls where not billed) as echecs,
       (select coalesce(sum(price_fcfa), 0) from calls where billed) as volume,
       (select coalesce(sum(amount_fcfa), 0) from ledger where kind = 'revenu') as createurs`,
  );
  const r = rows[0];
  const s = await soldePlateforme();
  const { rows: top } = await pool.query<{ name: string; slug: string; appels: string; volume: string }>(
    `select a.name, a.slug, count(c.id) as appels, coalesce(sum(c.price_fcfa), 0) as volume
     from apis a join calls c on c.api_id = a.id and c.billed
     group by a.id order by volume desc limit 5`,
  );
  const tuiles = [
    { t: "Développeurs", v: n(r.devs), s: `+${n(r.devs7)} cette semaine · ${n(r.bloques)} bloqué(s)` },
    { t: "API actives", v: n(r.apis), s: `${n(r.suspendues)} suspendue(s)` },
    { t: "Appels payés", v: n(r.appels), s: `${n(r.appels24)} sur 24 h · ${n(r.echecs)} remboursé(s)` },
    { t: "Volume traité", v: fcfa(Number(r.volume)), s: "total payé par les utilisateurs" },
    { t: "Versé aux créateurs", v: fcfa(Number(r.createurs)), s: "75 % de chaque appel" },
    { t: "Commissions plateforme", v: fcfa(s.commissions), s: `${fcfa(s.disponible)} disponibles au retrait`, fort: true },
  ];
  return (
    <>
      <dl data-guide="adm-kpi" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tuiles.map((x) => (
          <div key={x.t} className={`rounded-xl border p-4 ${x.fort ? "border-accent bg-accent-soft" : "border-line bg-card"}`}>
            <dt className="text-xs text-muted">{x.t}</dt>
            <dd className="mt-1 text-2xl font-semibold tabular-nums">{x.v}</dd>
            <dd className="mt-1 text-xs text-muted">{x.s}</dd>
          </div>
        ))}
      </dl>
      <h2 className="mt-8 font-semibold">API qui rapportent le plus</h2>
      <div data-guide="adm-top" className="mt-3 overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="p-3">API</th><th className="p-3 text-right">Appels</th><th className="p-3 text-right">Volume</th></tr></thead>
          <tbody>
            {top.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted">Aucun appel payé pour l&apos;instant.</td></tr>}
            {top.map((a) => (
              <tr key={a.slug} className="border-t border-line">
                <td className="p-3"><Link href={`/catalogue/${a.slug}`} className="hover:text-accent">{a.name}</Link></td>
                <td className="p-3 text-right tabular-nums">{n(a.appels)}</td>
                <td className="p-3 text-right tabular-nums">{fcfa(Number(a.volume))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- Comptes ---------- */

function Recherche({ onglet, q, placeholder }: { onglet: string; q: string; placeholder: string }) {
  return (
    <form data-guide="adm-recherche" className="flex gap-2" action="/admin">
      <input type="hidden" name="onglet" value={onglet} />
      <input name="q" defaultValue={q} placeholder={placeholder} aria-label="Rechercher"
        className="w-full max-w-md rounded-lg border border-line bg-card px-3 py-2 text-sm outline-none focus:border-accent" />
      <button className="rounded-lg border border-line bg-card px-4 py-2 text-sm font-medium hover:border-accent">Rechercher</button>
    </form>
  );
}

async function Comptes({ q, moi }: { q: string; moi: string }) {
  const { rows } = await pool.query<{
    id: string; name: string; email: string; country: string; role: string; blocked_at: Date | null; blocked_reason: string | null;
    balance_fcfa: number; earned_fcfa: number; apis: string; created_at: Date; prefixe: string | null;
  }>(
    `select d.id, d.name, d.email, d.country, d.role, d.blocked_at, d.blocked_reason, d.created_at,
            w.balance_fcfa, w.earned_fcfa,
            (select count(*) from apis a where a.owner_dev_id = d.id and a.deleted_at is null) as apis,
            (select k.prefix from api_keys k where k.dev_id = d.id and k.revoked_at is null order by k.created_at desc limit 1) as prefixe
     from devs d join wallets w on w.dev_id = d.id
     where $1 = '' or d.name ilike '%' || $1 || '%' or d.email ilike '%' || $1 || '%'
     order by d.created_at desc limit 200`,
    [q],
  );
  return (
    <>
      <Recherche onglet="comptes" q={q} placeholder="Nom ou e-mail…" />
      <p className="mt-3 text-sm text-muted">
        Clé perdue ? Les clés ne sont jamais stockées en clair, personne ne peut les relire : « Nouvelle clé » en crée une autre et désactive l&apos;ancienne.
      </p>
      <div data-guide="adm-comptes" className="mt-3 overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr><th className="p-3">Compte</th><th className="p-3">Pays</th><th className="p-3">Clé active</th><th className="p-3 text-right">Solde</th><th className="p-3 text-right">Gagné</th><th className="p-3 text-right">API</th><th className="p-3">Statut</th><th className="p-3">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((d, i) => {
              const g = (k: string) => (i === 0 ? k : undefined); // le guide vise la première ligne
              return (
                <tr key={d.id} className="border-t border-line align-top">
                  <td className="p-3"><p className="font-medium">{d.name}</p><p className="text-xs text-muted">{d.email}</p><p className="text-xs text-muted">inscrit le {date(d.created_at)}</p></td>
                  <td className="p-3">{d.country}</td>
                  <td className="p-3 font-mono text-xs">{d.prefixe ? `${d.prefixe}…` : "—"}</td>
                  <td className="p-3 text-right tabular-nums">{fcfa(d.balance_fcfa)}</td>
                  <td className="p-3 text-right tabular-nums">{fcfa(d.earned_fcfa)}</td>
                  <td className="p-3 text-right tabular-nums">{n(d.apis)}</td>
                  <td className="p-3" data-guide={g("adm-statut")}>
                    {d.role === "admin" && <span className="mr-1 rounded bg-orange-50 px-1.5 py-0.5 text-xs text-ocre">admin</span>}
                    {d.blocked_at
                      ? <span title={d.blocked_reason ?? ""} className="rounded bg-red-50 px-1.5 py-0.5 text-xs text-red-700">bloqué · {d.blocked_reason}</span>
                      : <span className="rounded bg-green-50 px-1.5 py-0.5 text-xs text-green-700">actif</span>}
                  </td>
                  <td className="p-3">
                    {d.id === moi ? <span className="text-xs text-muted">c&apos;est vous</span> : (
                      <div className="flex flex-wrap gap-1.5">
                        {d.blocked_at
                          ? <BoutonConfirme action={debloquerCompte} champs={{ devId: d.id }} libelle="Débloquer" guide={g("adm-bloquer")} />
                          : <FormBlocage devId={d.id} guide={g("adm-bloquer")} />}
                        <ResetCle devId={d.id} guide={g("adm-cle")} />
                        <BoutonConfirme action={basculerAdmin} champs={{ devId: d.id }} guide={g("adm-role")}
                          libelle={d.role === "admin" ? "Retirer admin" : "Rendre admin"} confirmation="Confirmer le rôle" />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-muted">Aucun compte trouvé.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- API ---------- */

async function Apis({ q }: { q: string }) {
  const { rows } = await pool.query<{
    id: string; slug: string; name: string; category: string; price_fcfa: number; is_active: boolean; deleted_at: Date | null;
    auteur: string; auteur_bloque: boolean; appels: string; upstream_url: string;
  }>(
    `select a.id, a.slug, a.name, a.category, a.price_fcfa, a.is_active, a.deleted_at, a.upstream_url,
            d.name as auteur, d.blocked_at is not null as auteur_bloque,
            (select count(*) from calls c where c.api_id = a.id and c.billed) as appels
     from apis a join devs d on d.id = a.owner_dev_id
     where $1 = '' or a.name ilike '%' || $1 || '%' or a.slug ilike '%' || $1 || '%' or d.name ilike '%' || $1 || '%'
     order by a.deleted_at nulls first, a.created_at desc limit 300`,
    [q],
  );
  return (
    <>
      <Recherche onglet="api" q={q} placeholder="Nom de l'API ou de l'auteur…" />
      <div data-guide="adm-apis" className="mt-3 overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted">
            <tr><th className="p-3">API</th><th className="p-3">Auteur</th><th className="p-3">Catégorie</th><th className="p-3 text-right">Prix</th><th className="p-3 text-right">Appels</th><th className="p-3">Statut</th><th className="p-3">Actions</th></tr>
          </thead>
          <tbody>
            {rows.map((a, i) => {
              const g = (k: string) => (i === 0 ? k : undefined);
              const statut = a.deleted_at ? "supprimée" : a.is_active ? "active" : a.auteur_bloque ? "masquée (auteur bloqué)" : "suspendue";
              const couleur = a.deleted_at ? "bg-gray-100 text-gray-600" : a.is_active ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700";
              return (
                <tr key={a.id} className={`border-t border-line align-top ${a.deleted_at ? "opacity-60" : ""}`}>
                  <td className="p-3"><p className="font-medium">{a.name}</p><p className="max-w-xs truncate font-mono text-xs text-muted" title={a.upstream_url}>{a.upstream_url}</p></td>
                  <td className="p-3">{a.auteur}</td>
                  <td className="p-3 text-muted">{nomCategorie(a.category)}</td>
                  <td className="p-3 text-right tabular-nums">{fcfa(a.price_fcfa)}</td>
                  <td className="p-3 text-right tabular-nums">{n(a.appels)}</td>
                  <td className="p-3"><span className={`rounded px-1.5 py-0.5 text-xs ${couleur}`}>{statut}</span></td>
                  <td className="p-3">
                    {!a.deleted_at && !a.auteur_bloque && (
                      <div className="flex flex-wrap gap-1.5">
                        <BoutonConfirme action={suspendreApi} champs={{ apiId: a.id, actif: a.is_active ? "0" : "1" }} guide={g("adm-suspendre")}
                          libelle={a.is_active ? "Suspendre" : "Réactiver"} />
                        <BoutonConfirme action={supprimerApi} champs={{ apiId: a.id }} danger guide={g("adm-supprimer")}
                          libelle="Supprimer" confirmation="Confirmer la suppression" />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-muted">Aucune API trouvée.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- Gains ---------- */

async function Gains() {
  const s = await soldePlateforme();
  const { rows } = await pool.query<{ amount_fcfa: number; note: string; created_at: Date }>(
    "select amount_fcfa, note, created_at from ledger where dev_id is null and kind = 'retrait' order by created_at desc limit 100",
  );
  return (
    <>
      <div data-guide="adm-solde" className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-card p-4"><p className="text-xs text-muted">Commissions encaissées (25 %)</p><p className="mt-1 text-2xl font-semibold tabular-nums">{fcfa(s.commissions)}</p></div>
        <div className="rounded-xl border border-line bg-card p-4"><p className="text-xs text-muted">Déjà retiré</p><p className="mt-1 text-2xl font-semibold tabular-nums">{fcfa(s.retraits)}</p></div>
        <div className="rounded-xl border border-accent bg-accent-soft p-4"><p className="text-xs text-muted">Disponible</p><p className="mt-1 text-2xl font-semibold tabular-nums">{fcfa(s.disponible)}</p></div>
      </div>
      <section data-guide="adm-retrait" className="mt-6 rounded-xl border border-line bg-card p-5">
        <h2 className="font-semibold">Récupérer les gains</h2>
        <p className="mt-1 text-sm text-muted">Mode test : le retrait est inscrit au grand livre ; en production, il déclenchera le versement Mobile Money ou bancaire.</p>
        <div className="mt-4"><FormRetrait disponible={s.disponible} /></div>
      </section>
      <h2 className="mt-8 font-semibold">Historique des retraits</h2>
      <div data-guide="adm-historique" className="mt-3 overflow-x-auto rounded-xl border border-line bg-card">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted"><tr><th className="p-3">Date (UTC)</th><th className="p-3">Vers · référence</th><th className="p-3 text-right">Montant</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted">Aucun retrait pour l&apos;instant.</td></tr>}
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line">
                <td className="p-3">{date(r.created_at)}</td><td className="p-3">{r.note}</td>
                <td className="p-3 text-right tabular-nums">{fcfa(-r.amount_fcfa)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ---------- Journal ---------- */

const LIBELLES: Record<string, string> = {
  bloquer_compte: "Compte bloqué", debloquer_compte: "Compte débloqué", reinitialiser_cle: "Nouvelle clé générée",
  donner_admin: "Accès admin donné", retirer_admin: "Accès admin retiré", suspendre_api: "API suspendue",
  reactiver_api: "API réactivée", supprimer_api: "API supprimée", retrait: "Retrait des gains",
};

async function Journal() {
  const { rows } = await pool.query<{ action: string; cible: string | null; details: string | null; created_at: Date; admin: string }>(
    `select j.action, j.cible, j.details, j.created_at, d.name as admin
     from admin_actions j join devs d on d.id = j.admin_dev_id order by j.created_at desc limit 200`,
  );
  return (
    <div data-guide="adm-journal" className="overflow-x-auto rounded-xl border border-line bg-card">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted"><tr><th className="p-3">Date (UTC)</th><th className="p-3">Admin</th><th className="p-3">Action</th><th className="p-3">Cible</th><th className="p-3">Détails</th></tr></thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-muted">Aucune action pour l&apos;instant.</td></tr>}
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-line">
              <td className="p-3 whitespace-nowrap">{date(r.created_at)}</td><td className="p-3">{r.admin}</td>
              <td className="p-3 font-medium">{LIBELLES[r.action] ?? r.action}</td><td className="p-3">{r.cible ?? "—"}</td>
              <td className="p-3 text-muted">{r.details ?? ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
