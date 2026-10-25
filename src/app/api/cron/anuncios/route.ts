import { syncAds } from "@/lib/ads-sync";

/**
 * Sincronização diária das métricas de anúncios (Vercel Cron, ver vercel.json).
 * A Vercel envia "Authorization: Bearer <CRON_SECRET>".
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const results = await syncAds(7);
  return Response.json({ ok: true, results });
}
