import ActionForm from "@/components/admin/ActionForm";
import { prisma } from "@/lib/prisma";
import { dateTime, money } from "@/lib/admin/format";
import { platformCampaigns, type Platform } from "@/lib/ads-sync";
import { googleAdsConfigured } from "@/lib/integrations/google-ads";
import { metaConfigured } from "@/lib/integrations/meta";
import { linkAdCampaign } from "../../../_actions/campaigns";

const names: Record<Platform, string> = { meta: "Meta Ads", google: "Google Ads" };
const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;

/** Vínculo da campanha com o Meta/Google Ads e as métricas importadas. */
export default async function AdsPanel({
  campaign,
  canEdit,
}: {
  campaign: { id: string; metaCampaignId: string | null; googleCampaignId: string | null; syncedAt: Date | null };
  canEdit: boolean;
}) {
  // Mostra a plataforma configurada ou que já tem vínculo (mesmo se o token saiu).
  const platforms: Platform[] = [];
  if (metaConfigured() || campaign.metaCampaignId) platforms.push("meta");
  if (googleAdsConfigured() || campaign.googleCampaignId) platforms.push("google");
  if (platforms.length === 0) return null;

  const since = new Date(Date.now() - 30 * 864e5);
  const metrics = await prisma.campaignMetric.groupBy({
    by: ["platform"],
    where: { campaignId: campaign.id },
    _sum: { spendCents: true, impressions: true, clicks: true, conversions: true },
  });
  const recent = await prisma.campaignMetric.aggregate({ where: { campaignId: campaign.id, date: { gte: since } }, _sum: { spendCents: true } });

  // Lista das campanhas da plataforma para escolher o vínculo (pode falhar se o token expirou).
  const options: Partial<Record<Platform, { id: string; name: string; status: string; linkedTo: { id: string; name: string } | null }[] | string>> = {};
  for (const p of platforms) {
    if (!canEdit || (p === "meta" ? !metaConfigured() : !googleAdsConfigured())) continue;
    try {
      options[p] = await platformCampaigns(p);
    } catch (error) {
      options[p] = error instanceof Error ? error.message : "Não foi possível listar as campanhas.";
    }
  }

  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <div>
          <h2>Anúncios</h2>
          <p className="adm-card-sub">
            {campaign.syncedAt ? `Métricas atualizadas em ${dateTime(campaign.syncedAt)}` : "Vincule à campanha da plataforma e sincronize em Campanhas."}
            {recent._sum.spendCents ? ` · ${money(recent._sum.spendCents)} nos últimos 30 dias` : ""}
          </p>
        </div>
      </div>
      <div className="adm-ads-grid">
        {platforms.map((p) => {
          const linked = p === "meta" ? campaign.metaCampaignId : campaign.googleCampaignId;
          const m = metrics.find((x) => x.platform === p)?._sum;
          const list = options[p];
          const spend = m?.spendCents ?? 0;
          const impressions = m?.impressions ?? 0;
          const clicks = m?.clicks ?? 0;
          const conversions = m?.conversions ?? 0;
          return (
            <div key={p} className="adm-ads-platform">
              <strong>{names[p]}</strong>
              {linked && m ? (
                <dl className="adm-ads-metrics">
                  <div>
                    <dt>Gasto</dt>
                    <dd>{money(spend)}</dd>
                  </div>
                  <div>
                    <dt>Impressões</dt>
                    <dd>{impressions.toLocaleString("pt-BR")}</dd>
                  </div>
                  <div>
                    <dt>Cliques · CTR</dt>
                    <dd>
                      {clicks.toLocaleString("pt-BR")} · {impressions ? pct((clicks / impressions) * 100) : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt>Custo por clique</dt>
                    <dd>{clicks ? money(Math.round(spend / clicks)) : "—"}</dd>
                  </div>
                  <div>
                    <dt>Conversões</dt>
                    <dd>{conversions.toLocaleString("pt-BR")}</dd>
                  </div>
                  <div>
                    <dt>Custo por conversão</dt>
                    <dd>{conversions ? money(Math.round(spend / conversions)) : "—"}</dd>
                  </div>
                </dl>
              ) : (
                <p className="adm-card-sub">{linked ? "Vinculada. Sincronize para trazer as métricas." : "Não vinculada."}</p>
              )}
              {canEdit &&
                (typeof list === "string" ? (
                  <p className="adm-msg error">{list}</p>
                ) : list ? (
                  <ActionForm action={linkAdCampaign.bind(null, campaign.id, p)} submitLabel={linked ? "Trocar vínculo" : "Vincular"} className="adm-form adm-form-inline">
                    <label className="adm-field wide">
                      <span className="adm-label">Campanha no {names[p]}</span>
                      <select name="externalId" defaultValue={linked ?? ""}>
                        <option value="">Nenhuma (desvincular)</option>
                        {list.map((c) => (
                          <option key={c.id} value={c.id} disabled={Boolean(c.linkedTo && c.linkedTo.id !== campaign.id)}>
                            {c.name} · {c.status}
                            {c.linkedTo && c.linkedTo.id !== campaign.id ? ` (já ligada a ${c.linkedTo.name})` : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                  </ActionForm>
                ) : null)}
            </div>
          );
        })}
      </div>
    </section>
  );
}
