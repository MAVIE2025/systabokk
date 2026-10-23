import { handleApiCall } from "@/lib/gateway";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string; path?: string[] }> };

async function handler(req: Request, ctx: Ctx) {
  const { slug, path } = await ctx.params;
  return handleApiCall(req, slug, path ?? []);
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
