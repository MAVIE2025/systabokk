"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scène animée de l'accueil : le concept de SystaBokk en 4 temps, en boucle.
 * 1. Aminata publie son API   2. Issa l'appelle, Aminata est payée
 * 3. Le fournisseur A tombe, bascule sur B   4. Un agent IA paie aussi
 * Respecte « réduire les animations » : affiche alors une version fixe.
 */

const PART_CREATEUR = 15; // 75 % de 20 FCFA (la plateforme garde 25 %)

type Phase = 0 | 1 | 2 | 3;
const LEGENDES: Record<Phase, { titre: string; texte: string }> = {
  0: { titre: "Je publie", texte: "Aminata, à Ouagadougou, publie son API « Montant en lettres » : 20 FCFA par appel." },
  1: { titre: "On l'utilise", texte: "Issa, à Abidjan, l'appelle avec sa clé SystaBokk. À chaque appel de 20 FCFA, Aminata touche 15 FCFA." },
  2: { titre: "Rien ne casse", texte: "L'API d'Aminata tombe en panne ? SystaBokk bascule sur celle de Moussa, à Dakar. Seul Moussa est payé." },
  3: { titre: "Même les IA paient", texte: "Un agent IA, lancé depuis Yaoundé, trouve l'API, l'appelle… et paie en FCFA. Peu importe d'où vous êtes." },
};

const CHEMINS = {
  clientGw: "M150 64 C178 64 172 150 200 150",
  agentGw: "M150 276 C178 276 172 190 200 190",
  gwA: "M320 150 C348 150 342 64 370 64",
  gwB: "M320 190 C348 190 342 276 370 276",
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
        piece(435, 4, `+${PART_CREATEUR} FCFA`);
      } else {
        setGainsB((g) => g + PART_CREATEUR);
        piece(435, 216, `+${PART_CREATEUR} FCFA`);
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

  const passerelle = (x: number, y: number) => (
    <g>
      <rect x={x} y={y} width={120} height={80} rx="12" fill="var(--accent)" stroke="var(--accent)" strokeWidth={2} />
      <text x={x + 60} y={y + 36} textAnchor="middle" fontSize="15" fontWeight="600" fill="#ffffff">SystaBokk</text>
      <text x={x + 60} y={y + 57} textAnchor="middle" fontSize="12" fill="#dbe6ff">paie à l&apos;appel</text>
    </g>
  );

  const personne = (id: string, x: number, y: number, nom: string, pays: Pays, avatar: AvatarType, opts: { panne?: boolean; agent?: boolean } = {}) => {
    const allume = actif === id;
    const bord = opts.panne ? "#dc2626" : allume ? "var(--accent)" : "var(--line)";
    const fond = opts.panne ? "#fef2f2" : allume ? "var(--accent-soft)" : "var(--card)";
    const cx = x + 65;
    const libelle = opts.panne ? "● En panne" : PAYS[pays].nom;
    const larg = 24 + libelle.length * 6.1;
    const dx = cx - larg / 2;
    return (
      <g>
        <rect x={x} y={y} width={130} height={96} rx="12" fill={fond} stroke={bord}
          strokeWidth={allume || opts.panne ? 2 : 1.25} style={{ transition: "all .25s" }} />
        <Avatar type={avatar} cx={cx} cy={y + 24} />
        <text x={cx} y={y + 61} textAnchor="middle" fontSize="13.5" fontWeight="600" fill={opts.agent ? "var(--ocre)" : "var(--foreground)"}>{nom}</text>
        <Drapeau pays={pays} x={dx} y={y + 72} />
        <text x={dx + 24} y={y + 82} fontSize="11" fill={opts.panne ? "#b91c1c" : "var(--muted)"}>{libelle}</text>
      </g>
    );
  };

  return (
    <div data-guide="accueil-anim" className="rounded-2xl border border-line bg-card p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-hidden>
          {([0, 1, 2, 3] as Phase[]).map((p) => (
            <span key={p} className={`h-1.5 rounded-full transition-all duration-300 ${p === phase ? "w-6 bg-accent" : "w-1.5 bg-line"}`} />
          ))}
        </div>
        <div data-guide="accueil-gains" className="flex gap-3 text-xs tabular-nums">
          <span className="text-muted">Aminata <b className="text-foreground">{gainsA} FCFA</b></span>
          <span className="text-muted">Moussa <b className="text-foreground">{gainsB} FCFA</b></span>
        </div>
      </div>

      <svg viewBox="0 -24 520 364" className="mt-2 w-full" role="img"
        aria-label="Animation : un appel d'API passe par SystaBokk et paie son créateur ; en cas de panne, bascule sur un autre fournisseur ; un agent IA paie aussi.">
        <defs>
          <style>{`@keyframes monte{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(-26px)}}`}</style>
        </defs>
        {(Object.keys(CHEMINS) as Chemin[]).map((k) => (
          <path key={k} ref={(el) => { chemins.current[k] = el; }} d={CHEMINS[k]} fill="none"
            stroke={k === "gwA" && panneA ? "#fca5a5" : "var(--line)"} strokeWidth="2" strokeDasharray={k === "gwA" && panneA ? "5 5" : undefined} />
        ))}
        {personne("client", 20, 16, "App d'Issa", "ci", "issa")}
        {personne("agent", 20, 228, "Agent IA", "cm", "robot", { agent: true })}
        {passerelle(200, 130)}
        {personne("A", 370, 16, "API d'Aminata", "bf", "aminata", { panne: panneA })}
        {personne("B", 370, 228, "API de Moussa", "sn", "moussa")}
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

/* ---------- Pays et drapeaux (SVG : les émojis drapeaux ne s'affichent pas sous Windows) ---------- */

type Pays = "bf" | "ci" | "sn" | "cm";
const PAYS: Record<Pays, { nom: string }> = {
  bf: { nom: "Burkina Faso" },
  ci: { nom: "Côte d'Ivoire" },
  sn: { nom: "Sénégal" },
  cm: { nom: "Cameroun" },
};

function etoile(cx: number, cy: number, r: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.4;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(2)},${(cy + rr * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(" ");
}

function Drapeau({ pays, x, y }: { pays: Pays; x: number; y: number }) {
  const w = 18, h = 12, t = w / 3;
  const verticales = (c: [string, string, string]) =>
    c.map((col, i) => <rect key={i} x={x + i * t} y={y} width={t + 0.2} height={h} fill={col} />);
  let corps;
  if (pays === "bf") {
    corps = <>
      <rect x={x} y={y} width={w} height={h / 2} fill="#EF2B2D" />
      <rect x={x} y={y + h / 2} width={w} height={h / 2} fill="#009E49" />
      <polygon points={etoile(x + w / 2, y + h / 2, 3.4)} fill="#FCD116" />
    </>;
  } else if (pays === "ci") {
    corps = <>{verticales(["#F77F00", "#FFFFFF", "#009E60"])}</>;
  } else if (pays === "sn") {
    corps = <>{verticales(["#00853F", "#FDEF42", "#E31B23"])}<polygon points={etoile(x + w / 2, y + h / 2, 3)} fill="#00853F" /></>;
  } else {
    corps = <>{verticales(["#007A5E", "#CE1126", "#FCD116"])}<polygon points={etoile(x + w / 2, y + h / 2, 3)} fill="#FCD116" /></>;
  }
  return (
    <g>
      {corps}
      <rect x={x} y={y} width={w} height={h} rx="1.5" fill="none" stroke="rgba(0,0,0,.18)" strokeWidth="0.6" />
    </g>
  );
}

/* ---------- Avatars illustrés ---------- */

type AvatarType = "issa" | "aminata" | "moussa" | "robot";

function Avatar({ type, cx, cy }: { type: AvatarType; cx: number; cy: number }) {
  const r = 18;
  const id = `av-${type}`;
  if (type === "robot") {
    return (
      <g>
        <circle cx={cx} cy={cy} r={r} fill="#fdecdc" />
        <line x1={cx} y1={cy - 13} x2={cx} y2={cy - 8} stroke="#b4530a" strokeWidth="1.6" />
        <circle cx={cx} cy={cy - 14} r="2" fill="#b4530a" />
        <rect x={cx - 10} y={cy - 8} width="20" height="15" rx="4" fill="#b4530a" />
        <circle cx={cx - 4.5} cy={cy - 1} r="2.4" fill="#ffffff" />
        <circle cx={cx + 4.5} cy={cy - 1} r="2.4" fill="#ffffff" />
        <rect x={cx - 4} y={cy + 3} width="8" height="1.6" rx=".8" fill="#ffd9b8" />
        <rect x={cx - 7} y={cy + 9} width="14" height="6" rx="2" fill="#d97706" />
      </g>
    );
  }
  const st = {
    issa: { fond: "#dbe7ff", peau: "#8d5524", habit: "#2563eb", cheveux: "#1f1410" },
    aminata: { fond: "#fde2e7", peau: "#6b3e26", habit: "#16a34a", cheveux: "#e11d48" },
    moussa: { fond: "#e0f2e9", peau: "#4a2c1a", habit: "#f59e0b", cheveux: "#111111" },
  }[type];
  return (
    <g>
      <defs>
        <clipPath id={id}><circle cx={cx} cy={cy} r={r} /></clipPath>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill={st.fond} />
      <g clipPath={`url(#${id})`}>
        {/* épaules */}
        <ellipse cx={cx} cy={cy + 19} rx="14" ry="10" fill={st.habit} />
        {/* cou */}
        <rect x={cx - 3} y={cy + 3} width="6" height="7" fill={st.peau} />
        {/* tête */}
        <ellipse cx={cx} cy={cy - 2} rx="7.5" ry="8.5" fill={st.peau} />
        {type === "aminata" && (
          <>
            <path d={`M${cx - 9} ${cy - 4} Q${cx - 9} ${cy - 16} ${cx} ${cy - 15} Q${cx + 10} ${cy - 16} ${cx + 9} ${cy - 4} Q${cx} ${cy - 9} ${cx - 9} ${cy - 4}Z`} fill={st.cheveux} />
            <circle cx={cx + 7} cy={cy - 14} r="3.5" fill={st.cheveux} />
          </>
        )}
        {type === "issa" && <path d={`M${cx - 7.6} ${cy - 3} Q${cx - 8} ${cy - 11.5} ${cx} ${cy - 11} Q${cx + 8} ${cy - 11.5} ${cx + 7.6} ${cy - 3} Q${cx} ${cy - 8} ${cx - 7.6} ${cy - 3}Z`} fill={st.cheveux} />}
        {type === "moussa" && (
          <>
            <path d={`M${cx - 8} ${cy - 5} Q${cx} ${cy - 15} ${cx + 8} ${cy - 5}Z`} fill="#ffffff" />
            <path d={`M${cx - 6} ${cy + 2} Q${cx} ${cy + 9} ${cx + 6} ${cy + 2} L${cx + 6} ${cy + 4} Q${cx} ${cy + 10} ${cx - 6} ${cy + 4}Z`} fill={st.cheveux} />
          </>
        )}
        <circle cx={cx - 2.8} cy={cy - 2} r="0.9" fill="#111" />
        <circle cx={cx + 2.8} cy={cy - 2} r="0.9" fill="#111" />
        <path d={`M${cx - 2.2} ${cy + 2} Q${cx} ${cy + 3.6} ${cx + 2.2} ${cy + 2}`} stroke="#111" strokeWidth=".8" fill="none" />
      </g>
    </g>
  );
}
