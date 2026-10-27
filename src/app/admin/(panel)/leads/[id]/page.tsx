import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import ActionForm, { ConfirmButton } from "@/components/admin/ActionForm";
import PageHeader from "@/components/admin/PageHeader";
import { StatusBadge } from "@/components/admin/Badges";
import { prisma } from "@/lib/prisma";
import { getTeam } from "@/lib/activity";
import { requireAccess } from "@/lib/access";
import { dateTime, phoneLink } from "@/lib/admin/format";
import { convertLead, deleteLead, saveLead } from "../../../_actions/leads";
import LeadFields from "../LeadFields";
import TempSwitch from "./TempSwitch";
import QuoteList, { quoteListSelect } from "@/components/admin/QuoteList";
import Can from "@/components/admin/Can";

export const metadata = { title: "Lead" };

export default async function LeadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAccess("leads", 1);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [lead, campaigns, team] = await Promise.all([
    prisma.lead.findUnique({ where: { id }, include: { quotes: { select: quoteListSelect, orderBy: { createdAt: "desc" } } } }),
    prisma.campaign.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getTeam(),
  ]);
  if (!lead) notFound();
  const wa = phoneLink(lead.phone);

  return (
    <>
      <PageHeader
        title={lead.name}
        subtitle={
          <>
            <StatusBadge value={lead.status} /> · Chegou em {dateTime(lead.createdAt)}
          </>
        }
        back={{ href: "/admin/leads", label: "Leads" }}
        actions={
          <>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="adm-btn whatsapp">
                WhatsApp
              </a>
            )}
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="adm-btn ghost">
                E-mail
              </a>
            )}
          </>
        }
      />

      <div className="adm-detail">
        <div className="adm-card">
          <ActionForm action={saveLead.bind(null, lead.id)} submitLabel="Salvar alterações">
            <LeadFields lead={lead} campaigns={campaigns} team={team} />
          </ActionForm>
        </div>

        <aside className="adm-side">
          <section className="adm-card">
            <h2>Temperatura</h2>
            <TempSwitch id={lead.id} value={lead.temperature} />
          </section>

          <section className="adm-card">
            <h2>Orçamentos</h2>
            <QuoteList quotes={lead.quotes} empty="Monte um orçamento com os serviços e valores e envie o link para o lead aprovar." />
            <Link href={`/admin/orcamentos/novo?lead=${lead.id}`} className="adm-btn ghost">
              + Orçamento
            </Link>
          </section>

          <section className="adm-card">
            <h2>Fechou negócio?</h2>
            {lead.clientId ? (
              <p className="adm-card-sub">
                Este lead já virou cliente. <Link href={`/admin/clientes/${lead.clientId}`}>Abrir cliente →</Link>
              </p>
            ) : (
              <p className="adm-card-sub">Cria o cliente e o projeto a partir deste lead e marca como “Projeto fechado”.</p>
            )}
            <ConfirmButton
              action={convertLead.bind(null, lead.id)}
              confirm="Criar cliente e projeto a partir deste lead?"
              className="adm-btn success"
            >
              {lead.clientId ? "Criar novo projeto" : "Converter em cliente + projeto"}
            </ConfirmButton>
          </section>

          {(lead.utmSource || lead.utmCampaign) && (
            <section className="adm-card">
              <h2>Rastreamento</h2>
              <dl className="adm-dl">
                <dt>utm_source</dt>
                <dd>{lead.utmSource ?? "—"}</dd>
                <dt>utm_medium</dt>
                <dd>{lead.utmMedium ?? "—"}</dd>
                <dt>utm_campaign</dt>
                <dd>{lead.utmCampaign ?? "—"}</dd>
              </dl>
            </section>
          )}

          <Can module="leads" level={3}>
            <ConfirmButton action={deleteLead.bind(null, lead.id)} confirm="Excluir este lead definitivamente?" className="adm-btn danger ghost">
              Excluir lead
            </ConfirmButton>
          </Can>
        </aside>
      </div>
    </>
  );
}
