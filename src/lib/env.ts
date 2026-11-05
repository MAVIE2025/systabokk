/** Adresse pour joindre l'appli depuis elle-même (API de démo, bouton « Essayer »). */
export function baseInterne(): string {
  return process.env.INTERNAL_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? 3000}`;
}
