// Conversion d'un entier en lettres, en français (règles de 1990 non appliquées :
// orthographe traditionnelle, utilisée sur les factures).

const UNITES = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf",
];
const DIZAINES = ["", "", "vingt", "trente", "quarante", "cinquante", "soixante"];

/** 0 à 99. `final` : le nombre termine l'expression (pour le « s » de quatre-vingts). */
function moinsDeCent(n: number, final: boolean): string {
  if (n < 20) return UNITES[n];
  if (n < 70) {
    const d = Math.floor(n / 10), u = n % 10;
    if (u === 0) return DIZAINES[d];
    return DIZAINES[d] + (u === 1 ? " et un" : "-" + UNITES[u]);
  }
  if (n < 80) return n === 71 ? "soixante et onze" : "soixante-" + UNITES[n - 60];
  if (n === 80) return final ? "quatre-vingts" : "quatre-vingt";
  return "quatre-vingt-" + UNITES[n - 80];
}

/** 0 à 999. */
function moinsDeMille(n: number, final: boolean): string {
  const c = Math.floor(n / 100), r = n % 100;
  if (c === 0) return moinsDeCent(r, final);
  const s = c === 1 ? "cent" : UNITES[c] + " cent";
  if (r === 0) return c > 1 && final ? s + "s" : s;
  return s + " " + moinsDeCent(r, final);
}

/** Entier positif ou nul, jusqu'à 999 999 999 999. */
export function nombreEnLettres(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999_999_999) {
    throw new RangeError("Entier entre 0 et 999 999 999 999 attendu.");
  }
  if (n === 0) return "zéro";

  const milliards = Math.floor(n / 1e9);
  const millions = Math.floor((n % 1e9) / 1e6);
  const milliers = Math.floor((n % 1e6) / 1e3);
  const reste = n % 1e3;
  const parts: string[] = [];

  if (milliards) parts.push(moinsDeMille(milliards, true) + (milliards > 1 ? " milliards" : " milliard"));
  if (millions) parts.push(moinsDeMille(millions, true) + (millions > 1 ? " millions" : " million"));
  if (milliers) parts.push(milliers === 1 ? "mille" : moinsDeMille(milliers, false) + " mille");
  if (reste) parts.push(moinsDeMille(reste, true));

  return parts.join(" ");
}
