import { NextResponse, type NextRequest } from "next/server";

/**
 * Renvoi optionnel vers une autre adresse du site (variable REDIRECT_TO).
 * Sert quand une instance ne peut pas joindre sa base : elle renvoie les visiteurs
 * vers l'instance qui fonctionne, en gardant le chemin demandé. /api/health reste local.
 */
export function middleware(req: NextRequest) {
  const cible = process.env.REDIRECT_TO;
  if (!cible || req.nextUrl.pathname === "/api/health") return NextResponse.next();
  return NextResponse.redirect(new URL(req.nextUrl.pathname + req.nextUrl.search, cible), 307);
}

export const config = { matcher: "/((?!_next/static|_next/image).*)" };
