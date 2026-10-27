import Link from "next/link";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import { CampaignBadge } from "@/components/admin/Badges";
import { fromDbDate, prisma } from "@/lib/prisma";
import { getAccess, requireAccess } from "@/lib/access";
import AdsIntegrations from "./AdsIntegrations";
import { money, shortDate } from "@/lib/admin/format";
import { campaignChannels, labelOf } from "@/lib/admin/options";

export const metadata = { title: "Campanhas" };

export default async function CampaignsPage() {
  await requireAccess("campanhas", 1);
  const canEdit = ((await getAccess())?.level("campanhas") ?? 0) >= 2;
  const campaigns = await prisma.campaign.findMany({
    include: {
      leads: {
        select: { temperature: true, status: true, valueCents: true, quotes: { where: { status: "aprovado" }, select: { totalCents: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  const rows = campaigns.map(({ leads, ...campaign }) => {
    const closed = leads.filter((l) => l.status === "fechado");
    return {
      campaign,
      leads: leads.length,
      hot: leads.filter((l) => l.temperature === "quente").length,
      closed: closed.length,
      // Valor do orçamento aprovado (o valor antigo do lead só para registros de antes dessa regra).
      revenue: closed.reduce((s, l) => s + (l.quotes.reduce((t, q) => t + q.totalCents, 0) || l.valueCents), 0),
    };
  });

  return (
    <>
      <PageHeader
        title="Campanhas"
        subtitle="Planeje as divulgações e acompanhe quantos leads e projetos cada uma gerou."
        actions={
          canEdit && (
            <Link href="/admin/campanhas/novo" className="adm-btn">
              + Nova campanha
            </Link>
          )
        }
      />
      <AdsIntegrations canEdit={canEdit} />
      {rows.length === 0 ? (
        <Empty title="Nenhuma campanha ainda">
          Crie uma campanha, use o link rastreável nos anúncios e os leads do site serão ligados a ela automaticamente.
        </Empty>
      ) : (
        <div className="adm-campaigns">
          {rows.map(({ campaign, leads: n, hot, closed, revenue }) => (
            <Link key={campaign.id} href={`/admin/campanhas/${campaign.id}`} className="adm-card adm-campaign">
              <div className="adm-card-head">
                <span className="adm-channel">
                  {campaign.channels.map((c) => labelOf(campaignChannels, c)).join(" · ") || "Sem canal"}
                </span>
                <CampaignBadge value={campaign.status} />
              </div>
              <h2>{campaign.name}</h2>
              <small className="adm-sub">
                {campaign.startDate
                  ? `${shortDate(fromDbDate(campaign.startDate))} → ${campaign.endDate ? shortDate(fromDbDate(campaign.endDate)) : "sem término"}`
                  : "Sem período definido"}
              </small>
              <dl className="adm-stats">
                <div>
                  <dt>Leads</dt>
                  <dd>{n}</dd>
                </div>
                <div>
                  <dt>Quentes</dt>
                  <dd>{hot}</dd>
                </div>
                <div>
                  <dt>Fechados</dt>
                  <dd>{closed}</dd>
                </div>
                <div>
                  <dt>Custo/lead</dt>
                  <dd>{n ? money(Math.round(campaign.budgetCents / n)) : "—"}</dd>
                </div>
              </dl>
              <div className="adm-campaign-foot">
                <span>Investido {money(campaign.budgetCents)}</span>
                <span>Retorno {money(revenue)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
