import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Meta (Facebook/Instagram) — Graph API / Marketing API.
 *
 * Variáveis de ambiente:
 *   META_ACCESS_TOKEN    token de usuário do sistema (Business Manager) com ads_read, leads_retrieval,
 *                        pages_show_list, pages_read_engagement e pages_manage_metadata
 *   META_AD_ACCOUNT_ID   conta de anúncios (ex.: act_1234567890 ou só os números)
 *   META_APP_SECRET      chave secreta do app (valida a assinatura do webhook)
 *   META_VERIFY_TOKEN    texto livre usado ao cadastrar o webhook no app
 *   META_GRAPH_VERSION   opcional (padrão v26.0)
 */

const version = () => process.env.META_GRAPH_VERSION || "v26.0";
const token = () => process.env.META_ACCESS_TOKEN ?? "";
export const adAccount = () => {
  const id = (process.env.META_AD_ACCOUNT_ID ?? "").trim();
  return id ? (id.startsWith("act_") ? id : `act_${id}`) : "";
};

export const metaConfigured = () => Boolean(token() && adAccount());
export const metaLeadsConfigured = () => Boolean(token() && process.env.META_APP_SECRET && process.env.META_VERIFY_TOKEN);

async function graph<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`https://graph.facebook.com/${version()}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("access_token", token());
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok || body.error) throw new Error(`Meta: ${body.error?.message ?? res.statusText}`);
  return body;
}

/** Percorre a paginação (cursor "next") até o limite de páginas. */
async function graphAll<T>(path: string, params: Record<string, string>, maxPages = 20): Promise<T[]> {
  const out: T[] = [];
  let page = await graph<{ data: T[]; paging?: { next?: string } }>(path, params);
  out.push(...page.data);
  for (let i = 1; i < maxPages && page.paging?.next; i++) {
    const res = await fetch(page.paging.next, { cache: "no-store", signal: AbortSignal.timeout(20000) });
    page = (await res.json()) as typeof page;
    out.push(...(page.data ?? []));
  }
  return out;
}

export type MetaCampaign = { id: string; name: string; status: string; start_time?: string; stop_time?: string };

export function listMetaCampaigns() {
  return graphAll<MetaCampaign>(`${adAccount()}/campaigns`, { fields: "id,name,status,start_time,stop_time", limit: "200" });
}

type InsightRow = {
  campaign_id: string;
  date_start: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: { action_type: string; value: string }[];
};

/** Métricas diárias por campanha no período (datas AAAA-MM-DD). */
export async function metaInsights(since: string, until: string) {
  const rows = await graphAll<InsightRow>(`${adAccount()}/insights`, {
    level: "campaign",
    fields: "campaign_id,spend,impressions,clicks,actions",
    time_increment: "1",
    time_range: JSON.stringify({ since, until }),
    limit: "500",
  });
  return rows.map((r) => ({
    campaignId: r.campaign_id,
    date: r.date_start,
    spendCents: Math.round(Number(r.spend ?? 0) * 100),
    impressions: Number(r.impressions ?? 0),
    clicks: Number(r.clicks ?? 0),
    // Leads de formulário + leads do pixel/site.
    conversions: (r.actions ?? []).filter((a) => a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped").reduce((s, a) => s + Number(a.value), 0),
  }));
}

export type MetaLead = {
  id: string;
  created_time: string;
  campaign_id?: string;
  campaign_name?: string;
  ad_name?: string;
  form_id?: string;
  platform?: string;
  field_data: { name: string; values: string[] }[];
};

/** Dados de um lead de formulário (Lead Ads) pelo leadgen_id recebido no webhook. */
export function fetchMetaLead(leadgenId: string) {
  return graph<MetaLead>(leadgenId, { fields: "id,created_time,campaign_id,campaign_name,ad_name,form_id,platform,field_data" });
}

/** Valida o cabeçalho X-Hub-Signature-256 do webhook. */
export function validMetaSignature(rawBody: string, header: string | null) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = Buffer.from(`sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}
