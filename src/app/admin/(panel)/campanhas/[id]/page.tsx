import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { z } from "zod";
import ActionForm, { ConfirmButton } from "@/components/admin/ActionForm";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import { CampaignBadge, StatusBadge, TempBadge } from "@/components/admin/Badges";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { dateTime, money } from "@/lib/admin/format";
import { campaignChannels, costTypes, labelOf } from "@/lib/admin/options";
import { deleteCampaign, saveCampaign } from "../../../_actions/campaigns";
import CampaignFields from "../CampaignFields";
import UtmLink from "./UtmLink";

export const metadata = { title: "Campanha" };

export default async function CampaignPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [campaign, leads] = await Promise.all([
    prisma.campaign.findUnique({ where: { id }, include: { costs: { orderBy: { createdAt: "asc" } } } }),
    prisma.lead.findMany({ where: { campaignId: id }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!campaign) notFound();

  const h = await headers();
  const origin = process.env.BETTER_AUTH_URL ?? `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const closed = leads.filter((l) => l.status === "fechado");
  const revenue = closed.reduce((s, l) => s + l.valueCents, 0);

  return (
    <>
      <PageHeader
        title={campaign.name}
        subtitle={
          <>
            <CampaignBadge value={campaign.status} /> · {campaign.channels.map((c) => labelOf(campaignChannels, c)).join(", ")}
          </>
        }
        back={{ href: "/admin/campanhas", label: "Campanhas" }}
      />

      <section className="adm-kpis">
        <div className="adm-kpi">
          <span>Leads gerados</span>
          <strong>{leads.length}</strong>
        </div>
        <div className="adm-kpi">
          <span>Projetos fechados</span>
          <strong>{closed.length}</strong>
          <small>{leads.length ? Math.round((closed.length / leads.length) * 100) : 0}% de conversão</small>
        </div>
        <div className="adm-kpi">
          <span>Custo por lead</span>
          <strong>{leads.length ? money(Math.round(campaign.budgetCents / leads.length)) : "—"}</strong>
          <small>Investimento de {money(campaign.budgetCents)}</small>
        </div>
        <div className="adm-kpi">
          <span>Retorno (fechados)</span>
          <strong>{money(revenue)}</strong>
          <small>
            {campaign.budgetCents ? `${(revenue / campaign.budgetCents).toFixed(1).replace(".", ",")}× o investimento` : "Sem investimento"}
          </small>
        </div>
      </section>

      <UtmLink
        origin={origin}
        slug={campaign.slug}
        channels={campaign.channels.map((c) => ({ value: c, label: labelOf(campaignChannels, c) }))}
      />

      {campaign.costs.length > 0 && (
        <section className="adm-card">
          <h2>Onde foi investido</h2>
          <ul className="adm-camp-bars">
            {campaign.costs.map((c) => (
              <li key={c.id}>
                <div className="adm-camp-line">
                  <span>
                    {labelOf(costTypes, c.type)}
                    {c.description && <small className="adm-sub">{c.description}</small>}
                  </span>
                  <b>{money(c.amountCents)}</b>
                </div>
                <span className="adm-bar-track">
                  <span className="adm-bar" style={{ width: `${(c.amountCents / Math.max(1, campaign.budgetCents)) * 100}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="adm-detail">
        <div className="adm-card">
          <ActionForm action={saveCampaign.bind(null, campaign.id)} submitLabel="Salvar alterações">
            <CampaignFields campaign={campaign} costs={campaign.costs} />
          </ActionForm>
        </div>
        <aside className="adm-side">
          <section className="adm-card">
            <h2>Leads desta campanha</h2>
            {leads.length === 0 ? (
              <Empty title="Nenhum lead ainda">Divulgue o link rastreável acima.</Empty>
            ) : (
              <ul className="adm-list compact">
                {leads.slice(0, 20).map((l) => (
                  <li key={l.id}>
                    <Link href={`/admin/leads/${l.id}`}>
                      <span>
                        <strong>{l.name}</strong>
                        <small>{dateTime(l.createdAt)}</small>
                      </span>
                      <span className="adm-list-badges">
                        <TempBadge value={l.temperature} />
                        <StatusBadge value={l.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <ConfirmButton
            action={deleteCampaign.bind(null, campaign.id)}
            confirm="Excluir esta campanha? Os leads continuam salvos, sem campanha vinculada."
            className="adm-btn danger ghost"
          >
            Excluir campanha
          </ConfirmButton>
        </aside>
      </div>
    </>
  );
}
