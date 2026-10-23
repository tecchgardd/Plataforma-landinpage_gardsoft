import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import ActionForm, { ConfirmButton } from "@/components/admin/ActionForm";
import ActionButton from "@/components/admin/ActionButton";
import { Input, Select } from "@/components/admin/Fields";
import Files from "@/components/admin/Files";
import PageHeader from "@/components/admin/PageHeader";
import { EntryBadge, InvoiceBadge } from "@/components/admin/Badges";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { money, moneyInput, shortDate } from "@/lib/admin/format";
import { labelOf, paymentMethods } from "@/lib/admin/options";
import { asaasConfigured } from "@/lib/integrations/asaas";
import { emailConfigured } from "@/lib/integrations/email";
import {
  cancelEntry,
  chargeEntry,
  deleteEntry,
  deleteEntryFile,
  emailEntry,
  invoiceEntry,
  payEntry,
  reopenEntry,
  saveEntry,
  syncEntry,
  uploadEntryFile,
} from "../../../../_actions/finance";
import EntryFields from "../../EntryFields";

export const metadata = { title: "Lançamento" };

export default async function EntryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  await requireUser();
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const [entry, clients, projects] = await Promise.all([
    prisma.financeEntry.findUnique({
      where: { id },
      include: {
        client: true,
        project: { select: { id: true, name: true } },
        contract: { select: { id: true, number: true } },
        invoice: { select: { id: true, number: true, status: true, pdfUrl: true, xmlUrl: true } },
        files: { select: { id: true, name: true, label: true, size: true, mime: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.client.findMany({ select: { id: true, name: true, company: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!entry) notFound();

  const isIncome = entry.type === "receber";
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const pending = entry.status === "pendente";
  const asaas = asaasConfigured();

  return (
    <>
      <PageHeader
        title={entry.description}
        subtitle={
          <>
            {money(entry.amountCents)} · vence {shortDate(entry.dueDate.toISOString().slice(0, 10))} · <EntryBadge status={entry.status} dueDate={entry.dueDate} />
            {entry.contract && (
              <>
                {" · "}
                <Link href={`/admin/contratos/${entry.contract.id}`}>Contrato {entry.contract.number}</Link>
              </>
            )}
          </>
        }
        back={{ href: `/admin/financeiro/${entry.type}`, label: isIncome ? "Contas a receber" : "Contas a pagar" }}
      />
      {erro === "asaas" && <p className="adm-alert">Cancele a cobrança no Asaas antes de excluir este lançamento.</p>}

      <div className="adm-detail">
        <div className="adm-modal-main">
          {entry.status === "pago" && (
            <section className="adm-card adm-signed">
              <h2>✓ Pago</h2>
              <p>
                {money(entry.paidAmountCents ?? entry.amountCents)} em {shortDate(entry.paidAt?.toISOString().slice(0, 10))}
                {entry.method ? ` · ${labelOf(paymentMethods, entry.method)}` : ""}
              </p>
              <ConfirmButton action={reopenEntry.bind(null, entry.id)} confirm="Desfazer a baixa deste lançamento?" className="adm-btn ghost small">
                Desfazer baixa
              </ConfirmButton>
            </section>
          )}

          {isIncome && entry.status !== "cancelado" && (
            <section className="adm-card">
              <h2>Cobrança</h2>
              {!asaas ? (
                <p className="adm-card-sub">
                  Asaas não configurado. Gere o boleto no seu banco e anexe abaixo, ou configure em{" "}
                  <Link href="/admin/financeiro/configuracoes">Financeiro → Cobrança e integrações</Link>.
                </p>
              ) : entry.asaasPaymentId ? (
                <>
                  <p className="adm-card-sub">
                    Cobrança <span className="adm-mono">{entry.asaasPaymentId}</span> · status no Asaas: <strong>{entry.asaasStatus}</strong>
                  </p>
                  <div className="adm-btn-row">
                    {entry.invoiceUrl && (
                      <a href={entry.invoiceUrl} target="_blank" rel="noopener noreferrer" className="adm-btn ghost">
                        Ver fatura (boleto/Pix) ↗
                      </a>
                    )}
                    {entry.bankSlipUrl && (
                      <a href={entry.bankSlipUrl} target="_blank" rel="noopener noreferrer" className="adm-btn ghost">
                        PDF do boleto ↗
                      </a>
                    )}
                    {pending && emailConfigured() && (
                      <ActionButton action={emailEntry.bind(null, entry.id)} className="adm-btn ghost" pendingText="Enviando...">
                        Enviar por e-mail
                      </ActionButton>
                    )}
                    <ActionButton action={syncEntry.bind(null, entry.id)} className="adm-btn ghost" pendingText="Sincronizando...">
                      Sincronizar
                    </ActionButton>
                  </div>
                </>
              ) : pending ? (
                <>
                  <p className="adm-card-sub">
                    Gera boleto e Pix no Asaas{entry.client?.email && emailConfigured() ? " — depois é só enviar por e-mail" : ""}. Quando o cliente pagar, a baixa é automática.
                  </p>
                  {!entry.clientId || !entry.client?.document ? (
                    <p className="adm-alert">
                      {entry.clientId ? "Cadastre o CPF/CNPJ do cliente para gerar a cobrança." : "Vincule um cliente a este lançamento para gerar a cobrança."}
                    </p>
                  ) : (
                    <ActionButton action={chargeEntry.bind(null, entry.id)} pendingText="Gerando...">
                      Gerar boleto / Pix
                    </ActionButton>
                  )}
                </>
              ) : (
                <p className="adm-card-sub">Pagamento registrado manualmente, sem cobrança no Asaas.</p>
              )}
            </section>
          )}

          {isIncome && entry.status === "pago" && (
            <section className="adm-card">
              <h2>Nota fiscal</h2>
              {entry.invoice ? (
                <>
                  <p className="adm-card-sub">
                    <InvoiceBadge status={entry.invoice.status} />
                    {entry.invoice.number && ` · Nº ${entry.invoice.number}`}
                  </p>
                  <div className="adm-btn-row">
                    <Link href={`/admin/notas-fiscais/${entry.invoice.id}`} className="adm-btn ghost">
                      Abrir nota
                    </Link>
                    {entry.invoice.pdfUrl && (
                      <a href={entry.invoice.pdfUrl} target="_blank" rel="noopener noreferrer" className="adm-btn ghost">
                        PDF da nota ↗
                      </a>
                    )}
                    {entry.invoice.xmlUrl && (
                      <a href={entry.invoice.xmlUrl} target="_blank" rel="noopener noreferrer" className="adm-btn ghost">
                        XML ↗
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {entry.asaasPaymentId && asaas ? (
                    <ActionButton action={invoiceEntry.bind(null, entry.id)} pendingText="Solicitando...">
                      Emitir nota fiscal (NFS-e)
                    </ActionButton>
                  ) : (
                    <p className="adm-card-sub">
                      A emissão automática usa a cobrança do Asaas. Se você emitiu a nota no portal da prefeitura, registre-a com o PDF e o XML.
                    </p>
                  )}
                  <Link href={`/admin/notas-fiscais/nova?lancamento=${entry.id}`} className="adm-btn ghost">
                    Registrar nota emitida fora
                  </Link>
                </>
              )}
            </section>
          )}

          {pending && (
            <section className="adm-card">
              <h2>{isIncome ? "Dar baixa (recebimento)" : "Dar baixa (pagamento)"}</h2>
              <p className="adm-card-sub">
                {isIncome && entry.asaasPaymentId
                  ? "Pagamentos pelo Asaas dão baixa sozinhos. Use isto só se o cliente pagou por outro meio."
                  : "Registre o pagamento e anexe o comprovante."}
              </p>
              <ActionForm action={payEntry.bind(null, entry.id)} submitLabel="Confirmar baixa">
                <Input label="Data do pagamento" name="paidAt" type="date" defaultValue={today} />
                <Input label="Valor pago (R$)" name="paidAmount" inputMode="decimal" defaultValue={moneyInput(entry.amountCents)} />
                <Select label="Forma de pagamento" name="method" options={paymentMethods} defaultValue={entry.method ?? "pix"} />
                <label className="adm-field">
                  <span className="adm-label">Comprovante (opcional)</span>
                  <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.webp" />
                </label>
              </ActionForm>
            </section>
          )}

          {entry.status !== "cancelado" && (
            <details className="adm-card adm-modal-edit">
              <summary>Editar lançamento</summary>
              <ActionForm action={saveEntry.bind(null, entry.id)} submitLabel="Salvar">
                <EntryFields type={isIncome ? "receber" : "pagar"} entry={entry} clients={clients} projects={projects} isNew={false} />
              </ActionForm>
            </details>
          )}
        </div>

        <aside className="adm-side">
          <section className="adm-card">
            <h2>Detalhes</h2>
            <dl className="adm-dl">
              <dt>Categoria</dt>
              <dd>{entry.category}</dd>
              {isIncome ? (
                <>
                  <dt>Cliente</dt>
                  <dd>{entry.client ? <Link href={`/admin/clientes/${entry.client.id}`}>{entry.client.company ?? entry.client.name}</Link> : "—"}</dd>
                </>
              ) : (
                <>
                  <dt>Fornecedor</dt>
                  <dd>{entry.supplier ?? "—"}</dd>
                </>
              )}
              <dt>Projeto</dt>
              <dd>{entry.project ? <Link href={`/admin/projetos?projeto=${entry.project.id}`}>{entry.project.name}</Link> : "—"}</dd>
              {entry.installmentTotal && (
                <>
                  <dt>Parcela</dt>
                  <dd>
                    {entry.installmentNumber}/{entry.installmentTotal}
                  </dd>
                </>
              )}
            </dl>
            {entry.notes && <p className="adm-prewrap" style={{ marginTop: 12 }}>{entry.notes}</p>}
          </section>
          <section className="adm-card">
            <h2>Comprovantes e documentos</h2>
            <Files
              type="financeiro"
              files={entry.files.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }))}
              upload={uploadEntryFile.bind(null, entry.id)}
              remove={deleteEntryFile}
              suggestions={["Comprovante de pagamento", "Boleto", "Nota fiscal", "Recibo"]}
            />
          </section>
          {pending && (
            <ActionButton action={cancelEntry.bind(null, entry.id)} className="adm-btn danger ghost" confirm="Cancelar este lançamento? Se houver cobrança no Asaas, ela também é cancelada.">
              Cancelar lançamento
            </ActionButton>
          )}
          <ConfirmButton action={deleteEntry.bind(null, entry.id)} confirm="Excluir este lançamento definitivamente?" className="adm-btn danger ghost">
            Excluir
          </ConfirmButton>
        </aside>
      </div>
    </>
  );
}
