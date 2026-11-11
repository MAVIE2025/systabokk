"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scène animée de l'accueil : le concept de SystaBokk en 4 temps, en boucle.
 * 1. Aminata publie son API   2. Issa l'appelle, Aminata est payée
 * 3. Le fournisseur A tombe, bascule sur B   4. Un agent IA paie aussi
 * Respecte « réduire les animations » : affiche alors une version fixe.
 */

const PRIX = 10;
const PART_CREATEUR = 9; // 90 %

type Phase = 0 | 1 | 2 | 3;
const LEGENDES: Record<Phase, { titre: string; texte: string }> = {
  0: { titre: "Je publie", texte: "Aminata, à Ouaga, publie son API « Montant en lettres » : 10 FCFA par appel." },
  1: { titre: "On l'utilise", texte: "Issa l'appelle avec sa clé SystaBokk. À chaque appel, Aminata touche 9 FCFA." },
  2: { titre: "Rien ne casse", texte: "Le fournisseur A tombe en panne ? SystaBokk bascule sur B. Seul B est payé." },
  3: { titre: "Même les IA paient", texte: "Un agent IA (Claude, Cursor…) trouve l'API, l'appelle… et paie en FCFA." },
};

const CHEMINS = {
  clientGw: "M150 68 C178 68 172 150 200 150",
  agentGw: "M150 272 C178 272 172 190 200 190",
  gwA: "M320 150 C348 150 342 68 370 68",
  gwB: "M320 190 C348 190 342 272 370 272",
} as const;
type Chemin = keyof typeof CHEMINS;

type Piece = { id: number; x: number; y: number; texte: string };

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function HeroAnime() {
  const [reduit, setReduit] = useState(false);
  const [phase, setPhase] = useState<Phase>(0);
  const [paquet, setPaquet] = useState<{ x: number; y: number; couleur: string } | null>(null);
  const [pieces, setPieces] = useState<Piece[]>([]);
  const [gainsA, setGainsA] = useState(0);
  const [gainsB, setGainsB] = useState(0);
  const [panneA, setPanneA] = useState(false);
  const [actif, setActif] = useState<string | null>(null);
  const chemins = useRef<Record<Chemin, SVGPathElement | null>>({ clientGw: null, agentGw: null, gwA: null, gwB: null });
  const idPiece = useRef(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduit(mq.matches);
    const f = () => setReduit(mq.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);

  useEffect(() => {
    if (reduit) return;
    let annule = false;

    const deplacer = (nom: Chemin, ms: number, couleur: string) =>
      new Promise<void>((fin) => {
        const p = chemins.current[nom];
        if (!p) return fin();
        const long = p.getTotalLength();
        const t0 = performance.now();
        const etape = (t: number) => {
          if (annule) return fin();
          const k = Math.min(1, (t - t0) / ms);
          const e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
          const pt = p.getPointAtLength(e * long);
          setPaquet({ x: pt.x, y: pt.y, couleur });
          if (k < 1) requestAnimationFrame(etape);
          else fin();
        };
        requestAnimationFrame(etape);
      });

    const piece = (x: number, y: number, texte: string) => {
      const id = ++idPiece.current;
      setPieces((ps) => [...ps, { id, x, y, texte }]);
      setTimeout(() => setPieces((ps) => ps.filter((q) => q.id !== id)), 1400);
    };

    const appel = async (depuis: Chemin, vers: "A" | "B", couleur = "#2563eb") => {
      setActif(depuis === "agentGw" ? "agent" : "client");
      await deplacer(depuis, 520, couleur);
      setActif("gw");
      if (vers === "B") {
        // tentative sur A, échec, puis bascule
        await deplacer("gwA", 380, "#dc2626");
        setActif("A");
        await pause(250);
        setActif("gw");
        await deplacer("gwB", 520, couleur);
      } else {
        await deplacer("gwA", 520, couleur);
      }
      setActif(vers);
      setPaquet(null);
      if (vers === "A") {
        setGainsA((g) => g + PART_CREATEUR);
        piece(435, 30, `+${PART_CREATEUR} FCFA`);
      } else {
        setGainsB((g) => g + PART_CREATEUR);
        piece(435, 234, `+${PART_CREATEUR} FCFA`);
      }
      await pause(450);
      setActif(null);
    };

    (async () => {
      while (!annule) {
        setGainsA(0); setGainsB(0); setPanneA(false); setActif(null); setPaquet(null);
        setPhase(0);
        setActif("A");
        await pause(2600);
        if (annule) break;
        setActif(null);

        setPhase(1);
        for (let i = 0; i < 3 && !annule; i++) await appel("clientGw", "A");
        await pause(500);
        if (annule) break;

        setPhase(2);
        setPanneA(true);
        await pause(900);
        for (let i = 0; i < 2 && !annule; i++) await appel("clientGw", "B");
        await pause(500);
        if (annule) break;

        setPhase(3);
        setPanneA(false);
        await pause(600);
        for (let i = 0; i < 2 && !annule; i++) await appel("agentGw", "A", "#b4530a");
        await pause(1800);
      }
    })();
    return () => { annule = true; };
  }, [reduit]);

  const L = LEGENDES[phase];

  if (reduit) {
    return (
      <div className="rounded-2xl border border-line bg-card p-5">
        <ol className="space-y-3">
          {([0, 1, 2, 3] as Phase[]).map((p) => (
            <li key={p} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{p + 1}</span>
              <p className="text-sm"><b>{LEGENDES[p].titre}.</b> {LEGENDES[p].texte}</p>
            </li>
          ))}
        </ol>
      </div>
    );
  }

  const noeud = (id: string, x: number, y: number, titre: string, sous: string, opts: { gw?: boolean; panne?: boolean; agent?: boolean } = {}) => {
    const allume = actif === id;
    const bord = opts.panne ? "#dc2626" : opts.gw || allume ? "var(--accent)" : "var(--line)";
    const fond = opts.gw ? "var(--accent)" : opts.panne ? "#fef2f2" : allume ? "var(--accent-soft)" : "var(--card)";
    const encre = opts.gw ? "#ffffff" : "var(--foreground)";
    return (
      <g style={{ transition: "all .25s" }}>
        <rect x={x} y={y} width={opts.gw ? 120 : 130} height={opts.gw ? 80 : 56} rx="12" fill={fond} stroke={bord}
          strokeWidth={allume || opts.gw || opts.panne ? 2 : 1.25} style={{ transition: "all .25s" }} />
        <text x={x + (opts.gw ? 60 : 65)} y={y + (opts.gw ? 36 : 25)} textAnchor="middle" fontSize="15" fontWeight="600" fill={opts.agent ? "var(--ocre)" : encre}>{titre}</text>
        <text x={x + (opts.gw ? 60 : 65)} y={y + (opts.gw ? 57 : 44)} textAnchor="middle" fontSize="12"
          fill={opts.gw ? "#dbe6ff" : opts.panne ? "#b91c1c" : "var(--muted)"}>{opts.panne ? "● En panne" : sous}</text>
      </g>
    );
  };

  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-hidden>
          {([0, 1, 2, 3] as Phase[]).map((p) => (
            <span key={p} className={`h-1.5 rounded-full transition-all duration-300 ${p === phase ? "w-6 bg-accent" : "w-1.5 bg-line"}`} />
          ))}
        </div>
        <div className="flex gap-3 text-xs tabular-nums">
          <span className="text-muted">Aminata <b className="text-foreground">{gainsA} FCFA</b></span>
          <span className="text-muted">Moussa <b className="text-foreground">{gainsB} FCFA</b></span>
        </div>
      </div>

      <svg viewBox="0 0 520 320" className="mt-2 w-full" role="img"
        aria-label="Animation : un appel d'API passe par SystaBokk et paie son créateur ; en cas de panne, bascule sur un autre fournisseur ; un agent IA paie aussi.">
        <defs>
          <style>{`@keyframes monte{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-26px)}}`}</style>
        </defs>
        {(Object.keys(CHEMINS) as Chemin[]).map((k) => (
          <path key={k} ref={(el) => { chemins.current[k] = el; }} d={CHEMINS[k]} fill="none"
            stroke={k === "gwA" && panneA ? "#fca5a5" : "var(--line)"} strokeWidth="2" strokeDasharray={k === "gwA" && panneA ? "5 5" : undefined} />
        ))}
        {noeud("client", 20, 40, "App d'Issa", "Ouagadougou")}
        {noeud("agent", 20, 244, "Agent IA", "Claude, Cursor", { agent: true })}
        {noeud("gw", 200, 130, "SystaBokk", "paie à l'appel", { gw: true })}
        {noeud("A", 370, 40, "API d'Aminata", `${PRIX} FCFA/appel`, { panne: panneA })}
        {noeud("B", 370, 244, "API de Moussa", `${PRIX} FCFA/appel`)}
        {paquet && <circle cx={paquet.x} cy={paquet.y} r="7" fill={paquet.couleur} stroke="#ffffff" strokeWidth="2" />}
        {pieces.map((p) => (
          <text key={p.id} x={p.x} y={p.y} textAnchor="middle" fontSize="16" fontWeight="700" fill="#16a34a"
            style={{ animation: "monte 1.3s ease-out forwards", transformBox: "fill-box" }}>{p.texte}</text>
        ))}
      </svg>

      <div aria-live="polite" className="mt-1 min-h-[3.5rem]">
        <p className="text-sm font-semibold text-accent">{phase + 1}. {L.titre}</p>
        <p className="text-sm text-muted">{L.texte}</p>
      </div>
    </div>
  );
}
