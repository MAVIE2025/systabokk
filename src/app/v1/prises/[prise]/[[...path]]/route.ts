import { handlePriseCall } from "@/lib/gateway";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ prise: string; path?: string[] }> };

async function handler(req: Request, ctx: Ctx) {
  const { prise, path } = await ctx.params;
  return handlePriseCall(req, prise, path ?? []);
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
