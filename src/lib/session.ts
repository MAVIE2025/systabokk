import { cookies } from "next/headers";
import { pool } from "@/db";
import { hashApiKey } from "@/lib/keys";

/** Le compte d'un dev = sa clé d'API, gardée dans un cookie httpOnly (jamais lisible par le JavaScript). */
export const COOKIE_CLE = "sbk_cle";

export type DevSession = {
  id: string;
  name: string;
  email: string;
  country: string;
  balance: number;
  earned: number;
  estJury: boolean;
  cle: string;
};

export async function lireCle(): Promise<string | null> {
  return (await cookies()).get(COOKIE_CLE)?.value ?? null;
}

export async function devParCle(cle: string): Promise<DevSession | null> {
  const { rows } = await pool.query<{
    id: string; name: string; email: string; country: string; balance_fcfa: number; earned_fcfa: number; label: string;
  }>(
    `select d.id, d.name, d.email, d.country, w.balance_fcfa, w.earned_fcfa, k.label
     from api_keys k join devs d on d.id = k.dev_id join wallets w on w.dev_id = d.id
     where k.key_hash = $1 and k.revoked_at is null`,
    [hashApiKey(cle)],
  );
  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id, name: r.name, email: r.email, country: r.country,
    balance: r.balance_fcfa, earned: r.earned_fcfa, estJury: r.label === "Pass Jury", cle,
  };
}

/** Le dev connecté, ou null. */
export async function devConnecte(): Promise<DevSession | null> {
  const cle = await lireCle();
  if (!cle) return null;
  try {
    return await devParCle(cle);
  } catch {
    return null;
  }
}

export async function poserCle(cle: string) {
  (await cookies()).set(COOKIE_CLE, cle, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function effacerCle() {
  (await cookies()).delete(COOKIE_CLE);
}
