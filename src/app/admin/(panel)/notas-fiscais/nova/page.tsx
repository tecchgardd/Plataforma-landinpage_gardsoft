import ActionForm from "@/components/admin/ActionForm";
import PageHeader from "@/components/admin/PageHeader";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getFinanceSettings } from "@/lib/finance/settings";
import { saveInvoice } from "../../../_actions/invoices";
import InvoiceFields from "../InvoiceFields";
import { invoiceOptions } from "../options";

export const metadata = { title: "Registrar nota fiscal" };

export default async function NewInvoicePage({ searchParams }: { searchParams: Promise<{ lancamento?: string }> }) {
  await requireUser();
  const { lancamento } = await searchParams;
  const entryId = lancamento && /^[0-9a-f-]{36}$/i.test(lancamento) ? lancamento : null;
  const [options, settings, entry] = await Promise.all([
    invoiceOptions(entryId),
    getFinanceSettings(),
    entryId ? prisma.financeEntry.findUnique({ where: { id: entryId }, select: { id: true, description: true, amountCents: true, paidAmountCents: true, paidAt: true, clientId: true } }) : null,
  ]);
  const amount = entry ? (entry.paidAmountCents ?? entry.amountCents) : 0;

  return (
    <>
      <PageHeader
        title="Registrar nota fiscal"
        subtitle="Para notas emitidas no portal da prefeitura. As notas do Asaas entram sozinhas."
        back={{ href: "/admin/notas-fiscais", label: "Notas fiscais" }}
      />
      <div className="adm-card">
        <ActionForm action={saveInvoice.bind(null, null)} submitLabel="Registrar nota">
          <InvoiceFields
            {...options}
            withFiles
            invoice={{
              number: null,
              series: null,
              status: "emitida",
              issueDate: entry?.paidAt?.toISOString().slice(0, 10) ?? new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10),
              amountCents: amount,
              issCents: amount ? Math.round((amount * settings.invoice.issPercent) / 100) : null,
              description: entry ? settings.invoice.description.replaceAll("{descricao}", entry.description) : "",
              verificationCode: null,
              clientId: entry?.clientId ?? null,
              entryId: entry?.id ?? null,
              notes: null,
            }}
          />
        </ActionForm>
      </div>
    </>
  );
}
