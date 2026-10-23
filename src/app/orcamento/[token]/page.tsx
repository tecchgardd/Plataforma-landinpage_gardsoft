import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Logo from "@/components/brand/Logo";
import { prisma } from "@/lib/prisma";
import { logSystem } from "@/lib/activity";
import { money } from "@/lib/finance/contract";
import { isExpired, itemTotal, loadQuote, recipientOf } from "@/lib/finance/quote";
import { getFinanceSettings } from "@/lib/finance/settings";
import DecisionForm from "./DecisionForm";
import "../../contrato/contrato.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Orçamento · Gardsoft", robots: { index: false, follow: false } };

const dateFmt = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
const dateOnly = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
const paragraphs = (text: string | null) => (text ?? "").split(/\n+/).filter(Boolean);

export default async function QuotePublicPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) notFound();
  const loaded = await loadQuote({ token });
  if (!loaded || loaded.quote.status === "rascunho") notFound();
  const { quote, items } = loaded;
  const to = recipientOf(quote);

  // Primeira abertura do link: registra a visualização.
  if (quote.status === "enviado") {
    await prisma.quote.updateMany({ where: { id: quote.id, status: "enviado" }, data: { status: "visualizado", viewedAt: new Date() } });
    await logSystem("visualizou", "orcamento", `Abriu o orçamento ${quote.number}`, quote.id, `${to.display} (cliente)`);
  }

  const settings = await getFinanceSettings();
  const company = settings.company;
  const pdfUrl = `/orcamento/${token}/pdf`;
  const subtotal = items.reduce((s, i) => s + itemTotal(i), 0);
  const expired = isExpired(quote);

  return (
    <div className="ct-page">
      <header className="ct-header">
        <Logo size={30} />
        <span>Orçamento</span>
      </header>

      <main className="ct-main">
        <section className="ct-summary">
          <span className="ct-number">{quote.number}</span>
          <h1>{quote.title}</h1>
          <dl>
            <div>
              <dt>Para</dt>
              <dd>{to.display}</dd>
            </div>
            <div>
              <dt>Valor total</dt>
              <dd>{money(quote.totalCents)}</dd>
            </div>
            {quote.deliveryDays && (
              <div>
                <dt>Prazo</dt>
                <dd>{quote.deliveryDays} dias</dd>
              </div>
            )}
            {quote.validUntil && (
              <div>
                <dt>Válido até</dt>
                <dd>{dateOnly(quote.validUntil)}</dd>
              </div>
            )}
          </dl>
        </section>

        <section className="ct-card ct-doc">
          <div className="ct-doc-head">
            <h2>Proposta</h2>
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              Ver em PDF ↗
            </a>
          </div>
          {paragraphs(quote.intro).map((p, i) => (
            <p key={i} className="ct-pre">
              {p}
            </p>
          ))}
          <h3>Serviços</h3>
          <table className="ct-plan q-items">
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>
                    <strong>{item.description}</strong>
                    {item.quantity !== 1 && <span className="q-qty"> · {String(item.quantity).replace(".", ",")} × {money(item.unitCents)}</span>}
                    {item.details && <small className="q-details">{item.details}</small>}
                  </td>
                  <td>{money(itemTotal(item))}</td>
                </tr>
              ))}
              {quote.discountCents > 0 && (
                <>
                  <tr>
                    <td>Subtotal</td>
                    <td>{money(subtotal)}</td>
                  </tr>
                  <tr>
                    <td>Desconto</td>
                    <td>− {money(quote.discountCents)}</td>
                  </tr>
                </>
              )}
              <tr className="ct-plan-total">
                <td>Valor total</td>
                <td>{money(quote.totalCents)}</td>
              </tr>
            </tbody>
          </table>
          {(quote.paymentTerms || quote.deliveryDays) && (
            <>
              <h3>Condições</h3>
              {quote.deliveryDays && <p className="ct-pre">Prazo estimado: {quote.deliveryDays} dias após a aprovação e o recebimento dos materiais.</p>}
              {quote.paymentTerms && <p className="ct-pre">Pagamento: {quote.paymentTerms}</p>}
            </>
          )}
          {quote.notes && (
            <>
              <h3>Observações</h3>
              <p className="ct-pre">{quote.notes}</p>
            </>
          )}
          <div className="ct-parties">
            <div>
              <span>Proposta de</span>
              <strong>{company.tradeName || company.legalName || "Gardsoft"}</strong>
              {company.document && <small>CNPJ {company.document}</small>}
              {(company.email || company.phone) && <small>{[company.email, company.phone].filter(Boolean).join(" · ")}</small>}
            </div>
          </div>
        </section>

        {quote.status === "cancelado" ? (
          <section className="ct-card ct-center">
            <h2>Este orçamento foi cancelado</h2>
            <p>Fale com a Gardsoft para receber uma nova versão.</p>
          </section>
        ) : quote.status === "aprovado" ? (
          <section className="ct-card ct-center ct-done">
            <span className="ct-check">✓</span>
            <h2>Orçamento aprovado</h2>
            <p>
              Aprovado por <strong>{quote.decisionName}</strong> em {dateFmt(quote.decidedAt!)}. Em breve você recebe o contrato para assinatura.
            </p>
          </section>
        ) : quote.status === "recusado" ? (
          <section className="ct-card ct-center">
            <h2>Orçamento recusado</h2>
            <p>Obrigado pela resposta! Se quiser ajustar algo, é só falar com a gente.</p>
          </section>
        ) : expired ? (
          <section className="ct-card ct-center">
            <h2>A validade deste orçamento terminou</h2>
            <p>Fale com a Gardsoft para receber uma versão atualizada.</p>
          </section>
        ) : (
          <section className="ct-card">
            <h2>Sua resposta</h2>
            <DecisionForm token={token} defaultName={to.name} />
          </section>
        )}
      </main>
      <footer className="ct-footer">Gardsoft · Tecnologia que impulsiona negócios</footer>
    </div>
  );
}
