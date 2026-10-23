import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import ActionForm, { ConfirmButton } from "@/components/admin/ActionForm";
import ActionButton from "@/components/admin/ActionButton";
import { Select, TextArea } from "@/components/admin/Fields";
import PageHeader from "@/components/admin/PageHeader";
import { ContractBadge, QuoteBadge } from "@/components/admin/Badges";
import { requireUser } from "@/lib/session";
import { dateTime, money, shortDate } from "@/lib/admin/format";
import { isExpired, itemTotal, loadQuote, quoteUrl, recipientOf } from "@/lib/finance/quote";
import { emailConfigured } from "@/lib/integrations/email";
import {
  cancelQuote,
  convertQuoteToContract,
  decideQuoteManually,
  deleteQuote,
  duplicateQuote,
  saveQuote,
  sendQuote,
} from "../../../_actions/quotes";
import CopyLink from "../../contratos/CopyLink";
import QuoteFields from "../QuoteFields";
import { quoteOptions } from "../options";

export const metadata = { title: "Orçamento" };

export default async function QuotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  await requireUser();
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const loaded = await loadQuote({ id });
  if (!loaded) notFound();
  const { quote, items } = loaded;
  const options = await quoteOptions(quote.leadId);

  const to = recipientOf(quote);
  const converted = Boolean(quote.contract);
  const editable = !converted && quote.status !== "cancelado";
  const answered = quote.status === "aprovado" || quote.status === "recusado";
  const sendable = editable && !answered;
  const expired = isExpired(quote);
  const link = quoteUrl(quote.token);
  const subtotal = items.reduce((s, i) => s + itemTotal(i), 0);

  const steps = [
    { label: "Criado", at: quote.createdAt, by: quote.createdBy?.name },
    { label: "Enviado ao cliente", at: quote.sentAt },
    { label: "Aberto pelo cliente", at: quote.viewedAt },
    { label: quote.status === "recusado" ? "Recusado" : "Aprovado", at: quote.decidedAt, by: quote.decisionName },
    { label: "Virou contrato", at: converted ? quote.updatedAt : null },
  ];

  return (
    <>
      <PageHeader
        title={quote.title}
        subtitle={
          <>
            <span className="adm-mono">{quote.number}</span> · <QuoteBadge status={quote.status} validUntil={quote.validUntil} /> ·{" "}
            {quote.client ? (
              <Link href={`/admin/clientes/${quote.client.id}`}>{to.display}</Link>
            ) : quote.lead ? (
              <Link href={`/admin/leads/${quote.lead.id}`}>{to.display} (lead)</Link>
            ) : (
              to.display
            )}
            {quote.project && (
              <>
                {" · "}
                <Link href={`/admin/projetos?projeto=${quote.project.id}`}>{quote.project.name}</Link>
              </>
            )}
          </>
        }
        back={{ href: "/admin/orcamentos", label: "Orçamentos" }}
        actions={
          <>
            <a href={`/api/orcamentos/${quote.id}/pdf`} target="_blank" rel="noopener noreferrer" className="adm-btn ghost">
              Ver PDF ↗
            </a>
            <a href={`/api/orcamentos/${quote.id}/pdf?baixar`} className="adm-btn ghost">
              Baixar
            </a>
          </>
        }
      />
      {erro === "aprovacao" && <p className="adm-alert">O orçamento precisa estar aprovado para virar contrato.</p>}

      <div className="adm-detail">
        <div className="adm-modal-main">
          {quote.contract ? (
            <section className="adm-card adm-signed">
              <h2>✓ Virou contrato</h2>
              <p>
                <Link href={`/admin/contratos/${quote.contract.id}`}>Contrato {quote.contract.number}</Link> · <ContractBadge status={quote.contract.status} />
              </p>
            </section>
          ) : quote.status === "aprovado" ? (
            <section className="adm-card adm-signed">
              <h2>✓ Orçamento aprovado</h2>
              <p>
                Por <strong>{quote.decisionName}</strong> em {dateTime(quote.decidedAt)}
                {quote.decisionIp ? ` · IP ${quote.decisionIp}` : ""}
              </p>
              {quote.decisionNote && <p className="adm-prewrap">“{quote.decisionNote}”</p>}
              <p className="adm-card-sub">Gere o contrato com os itens, o valor e o prazo deste orçamento. Você revisa tudo antes de enviar para assinatura.</p>
              <ConfirmButton action={convertQuoteToContract.bind(null, quote.id)} confirm="Gerar o contrato a partir deste orçamento?" className="adm-btn">
                Gerar contrato
              </ConfirmButton>
            </section>
          ) : quote.status === "recusado" ? (
            <section className="adm-card">
              <h2>Orçamento recusado</h2>
              <p>
                Por <strong>{quote.decisionName}</strong> em {dateTime(quote.decidedAt)}
              </p>
              {quote.decisionNote && <p className="adm-prewrap">Motivo: “{quote.decisionNote}”</p>}
              <ConfirmButton action={duplicateQuote.bind(null, quote.id)} confirm="Criar uma nova versão deste orçamento?" className="adm-btn ghost">
                Criar nova versão
              </ConfirmButton>
            </section>
          ) : (
            editable && (
              <section className="adm-card">
                <h2>Enviar para o cliente</h2>
                {expired && <p className="adm-alert">A validade deste orçamento passou. Atualize a data antes de reenviar.</p>}
                <p className="adm-card-sub">
                  {emailConfigured()
                    ? `${to.name} recebe por e-mail (${to.email ?? "sem e-mail"}) o link para ver e aprovar, com o PDF anexado.`
                    : "O e-mail ainda não está configurado: o portal gera o link para você enviar pelo WhatsApp ou pelo seu e-mail."}
                </p>
                {sendable && (
                  <ActionButton action={sendQuote.bind(null, quote.id)} pendingText="Enviando...">
                    {quote.sentAt ? "Reenviar orçamento" : "Enviar orçamento"}
                  </ActionButton>
                )}
                {quote.sentAt && (
                  <CopyLink url={link} phone={to.phone} message={`Olá, ${to.name.split(" ")[0]}! Segue o orçamento ${quote.number} da Gardsoft:`} />
                )}
              </section>
            )
          )}

          {editable ? (
            <section className="adm-card">
              <h2>Editar orçamento</h2>
              {quote.status !== "rascunho" && <p className="adm-card-sub">Alterar um orçamento já enviado ou respondido invalida o link anterior e exige um novo envio.</p>}
              <ActionForm action={saveQuote.bind(null, quote.id)} submitLabel="Salvar orçamento">
                <QuoteFields
                  {...options}
                  quote={{ ...quote, items, validUntil: quote.validUntil?.toISOString().slice(0, 10) ?? null }}
                />
              </ActionForm>
            </section>
          ) : (
            <section className="adm-card">
              <h2>Itens</h2>
              <ul className="adm-list compact">
                {items.map((item, i) => (
                  <li key={i}>
                    <div>
                      <span>
                        <strong>{item.description}</strong>
                        {item.details && <small className="adm-prewrap">{item.details}</small>}
                      </span>
                      <b>{money(itemTotal(item))}</b>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="adm-side">
          <section className="adm-card">
            <h2>Andamento</h2>
            <ol className="adm-steps-v">
              {steps.map((s) => (
                <li key={s.label} className={s.at ? "done" : ""}>
                  <span>{s.at ? "✓" : ""}</span>
                  <div>
                    <strong>{s.label}</strong>
                    <small>{s.at ? `${dateTime(s.at)}${s.by ? ` · ${s.by}` : ""}` : "—"}</small>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="adm-card">
            <div className="adm-card-head">
              <h2>Valores</h2>
              <b>{money(quote.totalCents)}</b>
            </div>
            <dl className="adm-dl">
              <dt>Itens</dt>
              <dd>{items.length}</dd>
              <dt>Subtotal</dt>
              <dd>{money(subtotal)}</dd>
              {quote.discountCents > 0 && (
                <>
                  <dt>Desconto</dt>
                  <dd>− {money(quote.discountCents)}</dd>
                </>
              )}
              <dt>Validade</dt>
              <dd>{quote.validUntil ? shortDate(quote.validUntil.toISOString().slice(0, 10)) : "—"}</dd>
              <dt>Prazo</dt>
              <dd>{quote.deliveryDays ? `${quote.deliveryDays} dias` : "—"}</dd>
            </dl>
          </section>

          {editable && !answered && (
            <section className="adm-card">
              <h2>Resposta por outro canal</h2>
              <p className="adm-card-sub">O cliente respondeu pelo WhatsApp ou numa reunião? Registre aqui.</p>
              <ActionForm action={decideQuoteManually.bind(null, quote.id)} submitLabel="Registrar resposta">
                <Select
                  label="Resposta"
                  name="decision"
                  options={[
                    { value: "aprovado", label: "Aprovou" },
                    { value: "recusado", label: "Recusou" },
                  ]}
                  defaultValue="aprovado"
                  wide
                />
                <TextArea label="Observação" name="note" wide rows={2} />
              </ActionForm>
            </section>
          )}

          {!converted && (
            <ConfirmButton action={duplicateQuote.bind(null, quote.id)} confirm="Duplicar este orçamento?" className="adm-btn ghost">
              Duplicar
            </ConfirmButton>
          )}
          {editable && (
            <ConfirmButton action={cancelQuote.bind(null, quote.id)} confirm="Cancelar este orçamento? O link deixa de funcionar." className="adm-btn danger ghost">
              Cancelar orçamento
            </ConfirmButton>
          )}
          {!converted && (
            <ConfirmButton action={deleteQuote.bind(null, quote.id)} confirm="Excluir este orçamento definitivamente?" className="adm-btn danger ghost">
              Excluir orçamento
            </ConfirmButton>
          )}
        </aside>
      </div>
    </>
  );
}
