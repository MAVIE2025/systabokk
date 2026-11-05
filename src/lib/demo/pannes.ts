// Pannes simulées des fournisseurs de démo (en mémoire, une seule instance en démo).
const etat = globalThis as unknown as { pannes?: Set<string> };
export const pannes = (etat.pannes ??= new Set<string>());

/** Bascule l'état de panne si le jeton de démo est bon. Renvoie null si refusé. */
export function basculerPanne(req: Request, cle: string): boolean | null {
  const jeton = process.env.DEMO_ADMIN_TOKEN;
  if (!jeton || req.headers.get("x-demo-token") !== jeton) return null;
  if (pannes.has(cle)) pannes.delete(cle);
  else pannes.add(cle);
  return pannes.has(cle);
}
