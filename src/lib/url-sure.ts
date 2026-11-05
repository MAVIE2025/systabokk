import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Protection SSRF : une API publiée ne doit jamais faire appeler par la passerelle
 * une adresse interne (le serveur lui-même, le réseau privé, les métadonnées du cloud…).
 */

function ipv4Prive(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) || // CGNAT
    (a === 169 && b === 254) ||          // lien local, métadonnées cloud
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224                             // multicast et réservé
  );
}

function ipv6Prive(ip: string): boolean {
  const x = ip.toLowerCase();
  if (x === "::" || x === "::1") return true;
  if (x.startsWith("::ffff:")) {
    const v4 = x.slice(7);
    return isIP(v4) === 4 ? ipv4Prive(v4) : true;
  }
  return /^f[cd]/.test(x) || /^fe[89ab]/.test(x) || x.startsWith("ff");
}

export function ipPrivee(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) return ipv4Prive(ip);
  if (v === 6) return ipv6Prive(ip);
  return true; // inconnu : refusé par prudence
}

export type VerifUrl = { ok: true; url: URL } | { ok: false; raison: string };

/** Vérifie la forme de l'URL (sans réseau). */
export function verifierFormeUrl(brut: string): VerifUrl {
  let url: URL;
  try {
    url = new URL(brut.trim());
  } catch {
    return { ok: false, raison: "Adresse invalide." };
  }
  const httpAutorise = process.env.ALLOW_HTTP_UPSTREAM === "1";
  if (url.protocol !== "https:" && !(httpAutorise && url.protocol === "http:")) {
    return { ok: false, raison: "L'adresse doit commencer par https://." };
  }
  if (url.username || url.password) {
    return { ok: false, raison: "Pas d'identifiants dans l'adresse : utilisez plutôt un en-tête côté fournisseur." };
  }
  const hote = url.hostname.replace(/^\[|\]$/g, "");
  if (hote === "localhost" || hote.endsWith(".localhost") || hote.endsWith(".internal") || hote.endsWith(".local")) {
    return { ok: false, raison: "Adresse interne refusée." };
  }
  if (isIP(hote) && ipPrivee(hote)) return { ok: false, raison: "Adresse IP privée refusée." };
  return { ok: true, url };
}

// Petit cache pour ne pas résoudre le DNS à chaque appel
const cache = new Map<string, { ok: boolean; jusqua: number }>();

/** Vérifie que le nom d'hôte ne résout QUE vers des adresses publiques. */
export async function hotePublic(hostname: string): Promise<boolean> {
  const hote = hostname.replace(/^\[|\]$/g, "");
  if (isIP(hote)) return !ipPrivee(hote);
  const c = cache.get(hote);
  if (c && c.jusqua > Date.now()) return c.ok;
  let ok = false;
  try {
    const adresses = await lookup(hote, { all: true, verbatim: true });
    ok = adresses.length > 0 && adresses.every((a) => !ipPrivee(a.address));
  } catch {
    ok = false;
  }
  cache.set(hote, { ok, jusqua: Date.now() + 60_000 });
  return ok;
}

/** Vérification complète, utilisée à la publication. */
export async function verifierUrlPublique(brut: string): Promise<VerifUrl> {
  const forme = verifierFormeUrl(brut);
  if (!forme.ok) return forme;
  if (!(await hotePublic(forme.url.hostname))) {
    return { ok: false, raison: "Ce nom de domaine est introuvable ou pointe vers une adresse privée." };
  }
  return forme;
}
