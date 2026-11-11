import type { PoolConfig } from "pg";

/**
 * Options de connexion PostgreSQL.
 * Connexion : DATABASE_URL, OU les variables séparées PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE
 * (lues directement par le pilote pg ; pratique quand le mot de passe contient des caractères spéciaux).
 * DATABASE_SSL : vide = pas de SSL (base locale ou réseau privé),
 *   « require » = SSL sans vérifier le certificat (base gérée avec certificat interne),
 *   « verify »  = SSL avec vérification complète.
 */
export function optionsPg(): PoolConfig {
  const mode = process.env.DATABASE_SSL;
  return {
    connectionString: process.env.DATABASE_URL || undefined,
    max: 10,
    ssl: mode === "verify" ? { rejectUnauthorized: true } : mode === "require" ? { rejectUnauthorized: false } : undefined,
  };
}
