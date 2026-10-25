import "server-only";
import { prisma } from "./prisma";
import { slugify } from "./admin/format";
import { googleAdsConfigured, googleInsights, listGoogleCampaigns } from "./integrations/google-ads";
import { listMetaCampaigns, metaConfigured, metaInsights } from "./integrations/meta";

export type Platform = "meta" | "google";
type DayMetric = { campaignId: string; date: string; spendCents: number; impressions: number; clicks: number; conversions: number };
export type SyncResult = { platform: Platform; ok: boolean; days: number; campaigns: number; spendCents: number; error?: string };

const field = (p: Platform) => (p === "meta" ? "metaCampaignId" : "googleCampaignId");
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Investimento total = custos lançados à mão + gasto importado das plataformas. */
export async function recalcBudget(campaignId: string) {
  const [costs, spend] = await Promise.all([
    prisma.campaignCost.aggregate({ where: { campaignId }, _sum: { amountCents: true } }),
    prisma.campaignMetric.aggregate({ where: { campaignId }, _sum: { spendCents: true } }),
  ]);
  await prisma.campaign.update({ where: { id: campaignId }, data: { budgetCents: (costs._sum.amountCents ?? 0) + (spend._sum.spendCents ?? 0) } });
}

async function store(platform: Platform, rows: DayMetric[]) {
  const linked = await prisma.campaign.findMany({
    where: { [field(platform)]: { in: [...new Set(rows.map((r) => r.campaignId))] } },
    select: { id: true, metaCampaignId: true, googleCampaignId: true },
  });
  const byExternal = new Map(linked.map((c) => [platform === "meta" ? c.metaCampaignId : c.googleCampaignId, c.id]));
  const touched = new Set<string>();
  let spend = 0;
  for (const r of rows) {
    const campaignId = byExternal.get(r.campaignId);
    if (!campaignId) continue;
    const date = new Date(`${r.date}T00:00:00Z`);
    const data = { spendCents: r.spendCents, impressions: r.impressions, clicks: r.clicks, conversions: r.conversions };
    await prisma.campaignMetric.upsert({
      where: { campaignId_platform_date: { campaignId, platform, date } },
      create: { campaignId, platform, date, ...data },
      update: data,
    });
    touched.add(campaignId);
    spend += r.spendCents;
  }
  for (const id of touched) {
    await recalcBudget(id);
    await prisma.campaign.update({ where: { id }, data: { syncedAt: new Date() } });
  }
  return { campaigns: touched.size, spend };
}

/** Importa as métricas diárias dos últimos `days` dias das plataformas configuradas. */
export async function syncAds(days = 30): Promise<SyncResult[]> {
  const until = iso(new Date());
  const since = iso(new Date(Date.now() - (days - 1) * 864e5));
  const results: SyncResult[] = [];
  const run = async (platform: Platform, fetcher: () => Promise<DayMetric[]>) => {
    try {
      const rows = await fetcher();
      const { campaigns, spend } = await store(platform, rows);
      results.push({ platform, ok: true, days, campaigns, spendCents: spend });
    } catch (error) {
      results.push({ platform, ok: false, days, campaigns: 0, spendCents: 0, error: error instanceof Error ? error.message : "erro desconhecido" });
    }
  };
  if (metaConfigured()) await run("meta", () => metaInsights(since, until));
  if (googleAdsConfigured()) await run("google", () => googleInsights(since, until));
  await prisma.content.upsert({
    where: { key: "config:ads" },
    create: { key: "config:ads", value: { lastSync: new Date().toISOString(), results } },
    update: { value: { lastSync: new Date().toISOString(), results } },
  });
  return results;
}

export async function lastAdsSync() {
  const row = await prisma.content.findUnique({ where: { key: "config:ads" } });
  return (row?.value as { lastSync?: string; results?: SyncResult[] } | null) ?? null;
}

const statusFrom = (s: string) => (/ACTIVE|ENABLED/i.test(s) ? "ativa" : /PAUSED/i.test(s) ? "pausada" : "encerrada");

async function uniqueSlug(name: string) {
  const base = slugify(name) || "campanha";
  for (let i = 1; ; i++) {
    const slug = i === 1 ? base : `${base}-${i}`;
    if (!(await prisma.campaign.findUnique({ where: { slug }, select: { id: true } }))) return slug;
  }
}

/** Campanhas da plataforma (para vincular), marcando as que já estão ligadas a uma campanha do portal. */
export async function platformCampaigns(platform: Platform) {
  const list = platform === "meta" ? await listMetaCampaigns() : await listGoogleCampaigns();
  const linked = await prisma.campaign.findMany({ where: { [field(platform)]: { in: list.map((c) => c.id) } }, select: { id: true, name: true, metaCampaignId: true, googleCampaignId: true } });
  const owner = new Map(linked.map((c) => [platform === "meta" ? c.metaCampaignId : c.googleCampaignId, c]));
  return list.map((c) => ({ id: c.id, name: c.name, status: c.status, linkedTo: owner.get(c.id) ?? null }));
}

/** Cria no portal as campanhas da plataforma que ainda não existem (já vinculadas). */
export async function importCampaigns(platform: Platform) {
  const list = await platformCampaigns(platform);
  let created = 0;
  for (const c of list.filter((x) => !x.linkedTo)) {
    await prisma.campaign.create({
      data: {
        name: c.name,
        slug: await uniqueSlug(c.name),
        status: statusFrom(c.status),
        channels: platform === "meta" ? ["facebook", "instagram"] : ["google"],
        [field(platform)]: c.id,
        notes: `Importada do ${platform === "meta" ? "Gerenciador de Anúncios da Meta" : "Google Ads"}.`,
      },
    });
    created++;
  }
  return created;
}
