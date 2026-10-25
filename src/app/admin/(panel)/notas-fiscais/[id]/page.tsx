import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import ActionForm, { ConfirmButton } from "@/components/admin/ActionForm";
import ActionButton from "@/components/admin/ActionButton";
import { TextArea } from "@/components/admin/Fields";
import Files from "@/components/admin/Files";
import PageHeader from "@/components/admin/PageHeader";
import { InvoiceBadge } from "@/components/admin/Badges";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/access";
import { dateTime, money, shortDate } from "@/lib/admin/format";
import { formatCpfCnpj } from "@/lib/finance/document";
import { cancelInvoice, deleteInvoice, deleteInvoiceFile, saveInvoice, syncInvoice, uploadInvoiceFile } from "../../../_actions/invoices";
import InvoiceFields from "../InvoiceFields";
import { invoiceOptions } from "../options";
import Can from "@/components/admin/Can";

export const metadata = { title: "Nota fiscal" };

const asaasLabel: Record<string, string> = {
  SCHEDULED: "Agendada",
  SYNCHRONIZED: "Enviada à prefeitura",
  AUTHORIZED: "Autorizada",
  PROCESSING_CANCELLATION: "Cancelamento em processamento",
  CANCELED: "Cancelada",
  CANCELLATION_DENIED: "Cancelamento negado",
  ERROR: "Erro na emissão",
};

export default async function InvoicePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  await requireAccess("notas", 1);
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: true,
      entry: { select: { id: true, description: true, contract: { select: { id: true, number: true } } } },
      files: { select: { id: true, name: true, label: true, size: true, mime: true, createdAt: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!invoice) notFound();
  const fromAsaas = invoice.source === "asaas";
  // Notas do Asaas e canceladas não se editam: só observações e anexos.
  const locked = fromAsaas || invoice.status === "cancelada";
  const options = locked ? null : await invoiceOptions(invoice.entryId);
  const title = invoice.number ? `NF ${invoice.number}${invoice.series ? `/${invoice.series}` : ""}` : "Nota fiscal sem número";

  return (
    <>
      <PageHeader
        title={title}
        subtitle={
          <>
            {money(invoice.amountCents)} · <InvoiceBadge status={invoice.status} /> · {fromAsaas ? "Emitida pelo Asaas" : "Registrada manualmente"}
          </>
        }
        back={{ href: "/admin/notas-fiscais", label: "Notas fiscais" }}
        actions={
          <>
            {invoice.pdfUrl && (
              <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer" className="adm-btn ghost">
                PDF ↗
              </a>
            )}
            {invoice.xmlUrl && (
              <a href={invoice.xmlUrl} target="_blank" rel="noopener noreferrer" className="adm-btn ghost">
                XML ↗
              </a>
            )}
          </>
        }
      />
      {erro === "arquivo" && <p className="adm-alert">A nota foi registrada, mas um dos arquivos não foi aceito. Anexe novamente ao lado.</p>}

      <div className="adm-detail">
        <div className="adm-modal-main">
          {invoice.status === "erro" && (
            <section className="adm-card">
              <h2>⚠ Erro na emissão</h2>
              <p className="adm-prewrap">{invoice.errorMessage ?? "A prefeitura recusou a nota."}</p>
              <p className="adm-card-sub">Corrija os dados no Asaas (Notas fiscais) ou nas configurações e sincronize.</p>
            </section>
          )}
          {invoice.status === "cancelada" && (
            <section className="adm-card">
              <h2>Nota cancelada</h2>
              <p>
                {invoice.cancelledAt ? `Em ${dateTime(invoice.cancelledAt)}` : ""}
                {invoice.cancelReason ? ` · Motivo: ${invoice.cancelReason}` : ""}
              </p>
            </section>
          )}

          {locked || !options ? (
            <section className="adm-card">
              <h2>Dados da nota</h2>
              <dl className="adm-dl">
                <dt>Emissão</dt>
                <dd>{invoice.issueDate ? shortDate(invoice.issueDate.toISOString().slice(0, 10)) : fromAsaas ? "Aguardando a prefeitura" : "—"}</dd>
                <dt>Valor</dt>
                <dd>{money(invoice.amountCents)}</dd>
                <dt>ISS</dt>
                <dd>{invoice.issCents ? money(invoice.issCents) : "—"}</dd>
                {fromAsaas && (
                  <>
                    <dt>No Asaas</dt>
                    <dd>{asaasLabel[invoice.asaasStatus ?? ""] ?? invoice.asaasStatus ?? "—"}</dd>
                    <dt>ID Asaas</dt>
                    <dd className="adm-mono">{invoice.asaasInvoiceId}</dd>
                  </>
                )}
              </dl>
              <p className="adm-prewrap" style={{ marginTop: 12 }}>
                {invoice.description}
              </p>
              {fromAsaas && (
                <div className="adm-btn-row">
                  <ActionButton action={syncInvoice.bind(null, invoice.id)} className="adm-btn ghost" pendingText="Sincronizando...">
                    Sincronizar com o Asaas
                  </ActionButton>
                </div>
              )}
              <ActionForm action={saveInvoice.bind(null, invoice.id)} submitLabel="Salvar observações">
                <TextArea label="Observações" name="notes" defaultValue={invoice.notes} wide rows={2} />
              </ActionForm>
            </section>
          ) : (
            <section className="adm-card">
              <h2>Editar nota</h2>
              <ActionForm action={saveInvoice.bind(null, invoice.id)} submitLabel="Salvar nota">
                <InvoiceFields
                  {...options}
                  withFiles={false}
                  invoice={{ ...invoice, issueDate: invoice.issueDate?.toISOString().slice(0, 10) ?? null }}
                />
              </ActionForm>
            </section>
          )}

          {invoice.status !== "cancelada" && (
            <details className="adm-card adm-modal-edit">
              <summary>Cancelar nota</summary>
              <p className="adm-card-sub">
                {fromAsaas
                  ? "O pedido de cancelamento vai para a prefeitura pelo Asaas. Cada município tem prazo próprio para cancelar."
                  : "Marque aqui depois de cancelar no portal da prefeitura."}
              </p>
              <ActionForm action={cancelInvoice.bind(null, invoice.id)} submitLabel="Cancelar nota">
                <TextArea label="Motivo do cancelamento" name="reason" wide rows={2} />
              </ActionForm>
            </details>
          )}
        </div>

        <aside className="adm-side">
          <section className="adm-card">
            <h2>Tomador</h2>
            {invoice.client ? (
              <dl className="adm-dl">
                <dt>Cliente</dt>
                <dd>
                  <Link href={`/admin/clientes/${invoice.client.id}`}>{invoice.client.company ?? invoice.client.name}</Link>
                </dd>
                <dt>CPF/CNPJ</dt>
                <dd>{invoice.client.document ? formatCpfCnpj(invoice.client.document) : "—"}</dd>
                <dt>E-mail</dt>
                <dd>{invoice.client.email ?? "—"}</dd>
              </dl>
            ) : (
              <p className="adm-card-sub">Sem cliente vinculado.</p>
            )}
            {invoice.entry && (
              <p style={{ marginTop: 12 }}>
                Recebimento: <Link href={`/admin/financeiro/lancamento/${invoice.entry.id}`}>{invoice.entry.description}</Link>
                {invoice.entry.contract && (
                  <>
                    {" · "}
                    <Link href={`/admin/contratos/${invoice.entry.contract.id}`}>Contrato {invoice.entry.contract.number}</Link>
                  </>
                )}
              </p>
            )}
            {invoice.verificationCode && (
              <p className="adm-card-sub" style={{ marginTop: 12 }}>
                Código de verificação: <span className="adm-mono">{invoice.verificationCode}</span>
              </p>
            )}
          </section>
          <section className="adm-card">
            <h2>Arquivos</h2>
            <Files
              type="notafiscal"
              files={invoice.files.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }))}
              upload={uploadInvoiceFile.bind(null, invoice.id)}
              remove={deleteInvoiceFile}
              suggestions={["PDF da nota", "XML da nota", "Carta de correção", "Comprovante de cancelamento"]}
            />
          </section>
          {!fromAsaas && (
            <Can module="notas" level={3}>
              <ConfirmButton action={deleteInvoice.bind(null, invoice.id)} confirm="Excluir o registro desta nota? (Isto não cancela a nota na prefeitura.)" className="adm-btn danger ghost">
                Excluir registro
              </ConfirmButton>
            </Can>
          )}
        </aside>
      </div>
    </>
  );
}
