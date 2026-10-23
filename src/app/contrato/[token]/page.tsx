import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Logo from "@/components/brand/Logo";
import { prisma } from "@/lib/prisma";
import { logSystem } from "@/lib/activity";
import { loadContract, money, partyName, renderClauses, renderPreamble, verificationCode } from "@/lib/finance/contract";
import { getFinanceSettings } from "@/lib/finance/settings";
import { formatCpfCnpj } from "@/lib/finance/document";
import SignForm from "./SignForm";
import "../contrato.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Assinatura de contrato · Gardsoft", robots: { index: false, follow: false } };

const dateFmt = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function ContractSignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) notFound();
  const loaded = await loadContract({ token });
  if (!loaded || loaded.contract.status === "rascunho") notFound();
  const { contract, data } = loaded;

  // Primeira abertura do link: registra a visualização.
  if (contract.status === "enviado") {
    await prisma.contract.updateMany({ where: { id: contract.id, status: "enviado" }, data: { status: "visualizado", viewedAt: new Date() } });
    await logSystem("visualizou", "contrato", `Abriu o contrato ${contract.number}`, contract.id, `${partyName(data.client)} (cliente)`);
  }

  const pdfUrl = `/contrato/${token}/pdf`;
  const settings = await getFinanceSettings();
  const company = settings.company;
  const clauses = renderClauses(data, settings).split(/\n+/).filter(Boolean);
  const preamble = renderPreamble(data, settings).split(/\n+/).filter(Boolean);
  const dateOnly = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");

  return (
    <div className="ct-page">
      <header className="ct-header">
        <Logo size={30} />
        <span>Assinatura eletrônica</span>
      </header>

      <main className="ct-main">
        <section className="ct-summary">
          <span className="ct-number">{contract.number}</span>
          <h1>{contract.title}</h1>
          <dl>
            <div>
              <dt>Contratante</dt>
              <dd>{partyName(data.client)}</dd>
            </div>
            <div>
              <dt>Valor total</dt>
              <dd>{money(contract.valueCents)}</dd>
            </div>
            <div>
              <dt>Parcelas</dt>
              <dd>{data.paymentPlan.length}</dd>
            </div>
            {contract.deliveryDays && (
              <div>
                <dt>Prazo</dt>
                <dd>{contract.deliveryDays} dias</dd>
              </div>
            )}
          </dl>
        </section>

        {contract.status === "cancelado" ? (
          <section className="ct-card ct-center">
            <h2>Este contrato foi cancelado</h2>
            <p>Fale com a Gardsoft para receber uma nova versão.</p>
          </section>
        ) : contract.status === "assinado" ? (
          <section className="ct-card ct-center ct-done">
            <span className="ct-check">✓</span>
            <h2>Contrato assinado</h2>
            <p>
              Assinado por <strong>{contract.signerName}</strong> ({formatCpfCnpj(contract.signerDocument)}) em {dateFmt(contract.signedAt!)}.
            </p>
            <p className="ct-code">Código de verificação: {verificationCode(contract.contentHash ?? "")}</p>
            <a className="ct-btn" href={`${pdfUrl}?baixar`}>
              Baixar via assinada (PDF)
            </a>
          </section>
        ) : (
          <>
            {/* O contrato em HTML: legível em qualquer celular (muitos não exibem PDF embutido). */}
            <section className="ct-card ct-doc">
              <div className="ct-doc-head">
                <h2>Leia o contrato</h2>
                <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                  Ver em PDF ↗
                </a>
              </div>
              <div className="ct-parties">
                <div>
                  <span>Contratada</span>
                  <strong>{company.legalName || "Gardsoft"}</strong>
                  {company.document && <small>CNPJ {company.document}</small>}
                  {company.cityState && <small>{company.cityState}</small>}
                </div>
                <div>
                  <span>Contratante</span>
                  <strong>{partyName(data.client)}</strong>
                  {data.client.document && <small>CPF/CNPJ {formatCpfCnpj(data.client.document)}</small>}
                  {data.client.address && <small>{data.client.address}</small>}
                  {data.client.city && (
                    <small>
                      {data.client.city}
                      {data.client.state ? `/${data.client.state}` : ""}
                    </small>
                  )}
                </div>
              </div>
              {preamble.length > 0 && (
                <div className="ct-clauses">
                  {preamble.map((line, i) => (
                    <p key={i}>{line}</p>
                  ))}
                </div>
              )}
              <h3>Escopo do projeto</h3>
              <p className="ct-pre">{data.scope}</p>
              <h3>Valor e plano de pagamento</h3>
              <table className="ct-plan">
                <tbody>
                  {data.paymentPlan.map((p, i) => (
                    <tr key={i}>
                      <td>{p.label}</td>
                      <td>{dateOnly(p.dueDate)}</td>
                      <td>{money(p.amountCents)}</td>
                    </tr>
                  ))}
                  <tr className="ct-plan-total">
                    <td colSpan={2}>Valor total</td>
                    <td>{money(data.valueCents)}</td>
                  </tr>
                </tbody>
              </table>
              <h3>Cláusulas</h3>
              <div className="ct-clauses">
                {clauses.map((line, i) => (/^CLÁUSULA/i.test(line) ? <h4 key={i}>{line}</h4> : <p key={i}>{line}</p>))}
              </div>
            </section>
            <section className="ct-card">
              <h2>Assinar</h2>
              <SignForm
                token={token}
                defaults={{ name: data.client.name, email: data.client.email ?? "", document: data.client.document ?? "" }}
              />
            </section>
          </>
        )}
      </main>
      <footer className="ct-footer">Gardsoft · Tecnologia que impulsiona negócios</footer>
    </div>
  );
}
