import ActionForm from "@/components/admin/ActionForm";
import PageHeader from "@/components/admin/PageHeader";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getFinanceSettings } from "@/lib/finance/settings";
import { saveQuote } from "../../../_actions/quotes";
import QuoteFields from "../QuoteFields";
import { quoteOptions } from "../options";

export const metadata = { title: "Novo orçamento" };

const uuid = (v?: string) => (v && /^[0-9a-f-]{36}$/i.test(v) ? v : null);

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ cliente?: string; lead?: string; projeto?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const [options, settings, lead, project] = await Promise.all([
    quoteOptions(uuid(sp.lead)),
    getFinanceSettings(),
    uuid(sp.lead) ? prisma.lead.findUnique({ where: { id: sp.lead }, select: { id: true, name: true, service: true, message: true, valueCents: true, clientId: true } }) : null,
    uuid(sp.projeto)
      ? prisma.project.findUnique({ where: { id: sp.projeto }, select: { id: true, name: true, clientId: true, service: true, description: true, valueCents: true } })
      : null,
  ]);
  const validUntil = new Date(Date.now() - 3 * 3600e3 + settings.quote.validityDays * 864e5).toISOString().slice(0, 10);
  const service = project?.service ?? lead?.service;
  const value = project?.valueCents || lead?.valueCents || 0;

  return (
    <>
      <PageHeader
        title="Novo orçamento"
        subtitle="Salve como rascunho, confira o PDF e envie o link para o cliente aprovar."
        back={{ href: "/admin/orcamentos", label: "Orçamentos" }}
      />
      <div className="adm-card">
        <ActionForm action={saveQuote.bind(null, null)} submitLabel="Salvar rascunho">
          <QuoteFields
            {...options}
            quote={{
              title: service ? `${service}${project ? ` — ${project.name}` : ""}` : "",
              clientId: project?.clientId ?? lead?.clientId ?? uuid(sp.cliente),
              leadId: lead?.id ?? null,
              projectId: project?.id ?? null,
              intro: settings.quote.intro,
              items: service ? [{ description: service, details: project?.description ?? lead?.message ?? "", quantity: 1, unitCents: value }] : [],
              discountCents: 0,
              validUntil,
              deliveryDays: settings.contract.deliveryDays || null,
              paymentTerms: settings.quote.paymentTerms,
              notes: settings.quote.notes,
            }}
          />
        </ActionForm>
      </div>
    </>
  );
}
