import "server-only";

/**
 * Google Ads API (REST, GAQL).
 *
 * Variáveis de ambiente:
 *   GOOGLE_ADS_DEVELOPER_TOKEN    token de desenvolvedor (Centro de API da conta de administrador)
 *   GOOGLE_ADS_CLIENT_ID          OAuth (Google Cloud → Credenciais)
 *   GOOGLE_ADS_CLIENT_SECRET
 *   GOOGLE_ADS_REFRESH_TOKEN      gerado uma vez com a conta que acessa o Google Ads
 *   GOOGLE_ADS_CUSTOMER_ID        conta de anúncios (123-456-7890 ou só números)
 *   GOOGLE_ADS_LOGIN_CUSTOMER_ID  opcional: conta de administrador (MCC) por onde o acesso é feito
 *   GOOGLE_ADS_API_VERSION        opcional (padrão v26)
 */

const digits = (v?: string) => (v ?? "").replace(/\D/g, "");
const customerId = () => digits(process.env.GOOGLE_ADS_CUSTOMER_ID);

export const googleAdsConfigured = () =>
  Boolean(
    process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
      process.env.GOOGLE_ADS_CLIENT_ID &&
      process.env.GOOGLE_ADS_CLIENT_SECRET &&
      process.env.GOOGLE_ADS_REFRESH_TOKEN &&
      customerId(),
  );

let cached: { token: string; expires: number } | null = null;

async function accessToken() {
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_ADS_CLIENT_ID!,
      client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET!,
      refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN!,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(15000),
  });
  const body = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !body.access_token) throw new Error(`Google Ads (login): ${body.error_description ?? res.statusText}`);
  cached = { token: body.access_token, expires: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return cached.token;
}

/** Executa uma consulta GAQL e devolve todas as linhas. */
async function search<T>(query: string): Promise<T[]> {
  const version = process.env.GOOGLE_ADS_API_VERSION || "v26";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${await accessToken()}`,
    "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!,
    "Content-Type": "application/json",
  };
  const login = digits(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  if (login) headers["login-customer-id"] = login;
  const res = await fetch(`https://googleads.googleapis.com/${version}/customers/${customerId()}/googleAds:searchStream`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
    cache: "no-store",
    signal: AbortSignal.timeout(30000),
  });
  const body = (await res.json().catch(() => null)) as { results?: T[]; error?: { message?: string } }[] | { error?: { message?: string } } | null;
  if (!res.ok || !Array.isArray(body)) {
    const message = Array.isArray(body) ? body[0]?.error?.message : body?.error?.message;
    throw new Error(`Google Ads: ${message ?? res.statusText}`);
  }
  return body.flatMap((chunk) => chunk.results ?? []);
}

type CampaignRow = { campaign: { id: string; name: string; status: string } };
type MetricRow = CampaignRow & {
  segments: { date: string };
  metrics: { costMicros?: string; impressions?: string; clicks?: string; conversions?: number };
};

export async function listGoogleCampaigns() {
  const rows = await search<CampaignRow>("SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.status != 'REMOVED' ORDER BY campaign.name");
  return rows.map((r) => ({ id: String(r.campaign.id), name: r.campaign.name, status: r.campaign.status }));
}

/** Métricas diárias por campanha no período (datas AAAA-MM-DD). Custo em micros → centavos. */
export async function googleInsights(since: string, until: string) {
  const rows = await search<MetricRow>(
    `SELECT campaign.id, segments.date, metrics.cost_micros, metrics.impressions, metrics.clicks, metrics.conversions
     FROM campaign WHERE segments.date BETWEEN '${since}' AND '${until}'`,
  );
  return rows.map((r) => ({
    campaignId: String(r.campaign.id),
    date: r.segments.date,
    spendCents: Math.round(Number(r.metrics.costMicros ?? 0) / 10_000),
    impressions: Number(r.metrics.impressions ?? 0),
    clicks: Number(r.metrics.clicks ?? 0),
    conversions: Math.round(Number(r.metrics.conversions ?? 0)),
  }));
}
