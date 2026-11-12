"use client";

import { useEffect, useState } from "react";

/** Bouton « Voir la vidéo » : ouvre la vidéo de présentation en grand, sans lecture automatique sur la page. */
export function VideoBouton() {
  const [ouvert, setOuvert] = useState(false);

  useEffect(() => {
    if (!ouvert) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    window.addEventListener("keydown", f);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", f); document.body.style.overflow = ""; };
  }, [ouvert]);

  return (
    <>
      <button
        type="button"
        data-guide="accueil-video"
        onClick={() => setOuvert(true)}
        className="group flex items-center gap-3 rounded-lg px-2 py-2 font-medium text-accent hover:opacity-90"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white shadow-md transition group-hover:scale-105" aria-hidden>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
        </span>
        Voir la vidéo <span className="text-sm text-muted">(40 s)</span>
      </button>

      {ouvert && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Vidéo de présentation de SystaBokk"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 p-4"
          onClick={() => setOuvert(false)}
        >
          <div className="relative w-full max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setOuvert(false)}
              className="absolute -top-11 right-0 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/25"
            >
              Fermer ✕
            </button>
            <video
              src="/video/systabokk.mp4"
              poster="/video/apercu.jpg"
              controls
              autoPlay
              playsInline
              className="aspect-video w-full rounded-2xl bg-black shadow-2xl"
            />
          </div>
        </div>
      )}
    </>
  );
}
