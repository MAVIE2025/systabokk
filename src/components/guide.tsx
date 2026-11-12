"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ETAPES_MENU, GUIDES, type EtapeGuide } from "@/lib/guide-etapes";

/**
 * Guide de première visite : met en lumière chaque élément de la page et explique
 * ce qu'il fait ou ce qu'il attend. Se lance tout seul la première fois qu'on ouvre
 * une page (séparément connecté / non connecté). « Passer le guide » coupe le lancement
 * automatique partout ; le bouton « ? » en bas à droite le relance à tout moment.
 */

const CLE_OFF = "sbk_guide_off";
const CLE_VUS = "sbk_guide_vus";
const CLE_MENU = "sbk_guide_menu";

function lire(cle: string): string | null {
  try { return localStorage.getItem(cle); } catch { return null; }
}
function ecrire(cle: string, v: string) {
  try { localStorage.setItem(cle, v); } catch { /* stockage indisponible : le guide reste utilisable */ }
}
function pagesVues(): string[] {
  try { return JSON.parse(lire(CLE_VUS) ?? "[]"); } catch { return []; }
}
function marquerVue(cle: string) {
  const v = pagesVues();
  if (!v.includes(cle)) ecrire(CLE_VUS, JSON.stringify([...v, cle]));
}

function visible(sel?: string): HTMLElement | null {
  if (!sel) return null;
  const el = document.querySelector<HTMLElement>(sel);
  return el && el.getClientRects().length > 0 ? el : null;
}

type Rect = { top: number; left: number; width: number; height: number };

export function Guide({ connecte }: { connecte: boolean }) {
  const chemin = usePathname();
  const guide = GUIDES.find((g) => g.correspond(chemin));
  const clePage = guide ? `${guide.cle}:${connecte ? "in" : "out"}` : null;

  const [etapes, setEtapes] = useState<EtapeGuide[] | null>(null);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [monte, setMonte] = useState(false);
  const suivantRef = useRef<HTMLButtonElement>(null);

  useEffect(() => setMonte(true), []);

  const construire = useCallback((avecMenu: boolean): EtapeGuide[] => {
    if (!guide) return [];
    const page = guide.etapes;
    let liste: EtapeGuide[];
    if (avecMenu && guide.cle === "accueil") liste = [page[0], ...ETAPES_MENU, ...page.slice(1)];
    else if (avecMenu) liste = [...ETAPES_MENU, ...page];
    else liste = page;
    return liste.filter((e) => !e.cible || visible(e.cible));
  }, [guide]);

  const demarrer = useCallback((avecMenu: boolean) => {
    const liste = construire(avecMenu);
    if (liste.length === 0) return;
    setI(0);
    setEtapes(liste);
  }, [construire]);

  // Lancement automatique à la première visite de chaque page
  useEffect(() => {
    setEtapes(null);
    if (!clePage || lire(CLE_OFF) === "1" || pagesVues().includes(clePage)) return;
    const t = setTimeout(() => demarrer(lire(CLE_MENU) !== "1"), 700);
    return () => clearTimeout(t);
  }, [clePage, demarrer]);

  const fermer = useCallback((passer: boolean) => {
    if (clePage) marquerVue(clePage);
    if (etapes?.some((e) => ETAPES_MENU.includes(e))) ecrire(CLE_MENU, "1");
    if (passer) ecrire(CLE_OFF, "1");
    setEtapes(null);
    setRect(null);
  }, [clePage, etapes]);

  const etape = etapes?.[i];

  // Mise en lumière de l'élément visé, suivie au défilement et au redimensionnement
  useLayoutEffect(() => {
    if (!etape) return;
    const el = visible(etape.cible);
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    let rafId = 0;
    const mesurer = () => {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };
    const boucle = () => { mesurer(); rafId = requestAnimationFrame(boucle); };
    boucle();
    return () => cancelAnimationFrame(rafId);
  }, [etape]);

  useEffect(() => { if (etape) suivantRef.current?.focus({ preventScroll: true }); }, [etape]);

  // Clavier : flèches pour naviguer, Échap pour fermer
  useEffect(() => {
    if (!etapes) return;
    const f = (e: KeyboardEvent) => {
      if (e.key === "Escape") fermer(false);
      else if (e.key === "ArrowRight") setI((n) => (n < etapes.length - 1 ? n + 1 : n));
      else if (e.key === "ArrowLeft") setI((n) => Math.max(0, n - 1));
    };
    window.addEventListener("keydown", f);
    return () => window.removeEventListener("keydown", f);
  }, [etapes, fermer]);

  if (!monte) return null;

  const bouton = guide && (
    <button
      type="button"
      data-guide="guide-revoir"
      onClick={() => demarrer(guide.cle === "accueil")}
      className="fixed bottom-4 right-4 z-[80] flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-white shadow-lg hover:opacity-90"
      aria-label="Revoir le guide de cette page"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/25 text-xs font-bold">?</span>
      Guide
    </button>
  );

  if (!etapes || !etape) return bouton ?? null;

  // Position de la bulle : sous l'élément s'il y a la place, sinon au-dessus ; centrée sans cible
  const vw = window.innerWidth, vh = window.innerHeight;
  const larg = Math.min(360, vw - 32);
  const marge = 12;
  let style: React.CSSProperties;
  if (rect) {
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - larg / 2), vw - larg - 16);
    const dessous = rect.top + rect.height + marge;
    style = vh - dessous > 230 || rect.top < 230
      ? { top: Math.min(dessous, vh - 230), left, width: larg }
      : { bottom: vh - rect.top + marge, left, width: larg };
  } else {
    style = { top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: larg };
  }
  const dernier = i === etapes.length - 1;

  return (
    <>
      {bouton}
      {createPortal(
    <>
      {/* bloque les clics sur la page pendant le guide */}
      <div className={`fixed inset-0 z-[90] ${rect ? "" : "bg-slate-900/55"}`} onClick={() => undefined} aria-hidden />
      {rect && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[91] rounded-xl ring-2 ring-accent transition-all duration-200"
          style={{
            top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12,
            boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.55)",
          }}
        />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-titre"
        className="fixed z-[92] rounded-2xl border border-line bg-card p-5 shadow-2xl"
        style={style}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-accent">Guide · {i + 1} / {etapes.length}</p>
          <button type="button" onClick={() => fermer(false)} className="text-muted hover:text-foreground" aria-label="Fermer le guide">✕</button>
        </div>
        <h2 id="guide-titre" className="mt-1 font-semibold">{etape.titre}</h2>
        <p className="mt-1 text-sm text-muted">{etape.texte}</p>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-line" aria-hidden>
          <div className="h-full bg-accent transition-all duration-300" style={{ width: `${((i + 1) / etapes.length) * 100}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button type="button" onClick={() => fermer(true)} className="text-sm text-muted underline hover:text-foreground">
            Passer le guide
          </button>
          <div className="flex gap-2">
            {i > 0 && (
              <button type="button" onClick={() => setI(i - 1)} className="rounded-lg border border-line px-3 py-2 text-sm font-medium hover:border-accent">
                Précédent
              </button>
            )}
            <button
              ref={suivantRef}
              type="button"
              onClick={() => (dernier ? fermer(false) : setI(i + 1))}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              {dernier ? "Terminer" : "Suivant"}
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
      )}
    </>
  );
}
