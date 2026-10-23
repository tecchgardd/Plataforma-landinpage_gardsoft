import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import ActionForm, { ConfirmButton } from "@/components/admin/ActionForm";
import ActionButton from "@/components/admin/ActionButton";
import PageHeader from "@/components/admin/PageHeader";
import { ContractBadge, EntryBadge } from "@/components/admin/Badges";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { dateTime, money, shortDate } from "@/lib/admin/format";
import { paymentPlanSchema, signUrl, verificationCode } from "@/lib/finance/contract";
import { formatCpfCnpj } from "@/lib/finance/document";
import { asaasConfigured } from "@/lib/integrations/asaas";
import { emailConfigured } from "@/lib/integrations/email";
import { cancelContract, deleteContract, generateCharges, saveContract, sendContract } from "../../../_actions/contracts";
import ContractFields from "../ContractFields";
import CopyLink from "../CopyLink";

export const metadata = { title: "Contrato" };

export default async function ContractPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [contract, clients, projects] = await Promise.all([
    prisma.contract.findUnique({
      where: { id },
      include: {
        client: true,
        project: { select: { id: true, name: true } },
        createdBy: { select: { name: true } },
        entries: { orderBy: { dueDate: "asc" } },
      },
    }),
    prisma.client.findMany({ select: { id: true, name: true, company: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
  ]);
  if (!contract) notFound();

  const plan = paymentPlanSchema.safeParse(contract.paymentPlan);
  const editable = contract.status !== "assinado" && contract.status !== "cancelado";
  const sendable = editable;
  const link = signUrl(contract.token);
  const missing = [
    !contract.client.document && "CPF/CNPJ",
    !contract.client.email && "e-mail",
    !contract.client.address && "endereço",
  ].filter(Boolean) as string[];

  const steps = [
    { label: "Criado", at: contract.createdAt, by: contract.createdBy?.name },
    { label: "Enviado ao cliente", at: contract.sentAt },
    { label: "Aberto pelo cliente", at: contract.viewedAt },
    { label: "Assinado", at: contract.signedAt, by: contract.signerName },
  ];

  return (
    <>
      <PageHeader
        title={contract.title}
        subtitle={
          <>
            <span className="adm-mono">{contract.number}</span> · <ContractBadge status={contract.status} /> ·{" "}
            <Link href={`/admin/clientes/${contract.clientId}`}>{contract.client.company ?? contract.client.name}</Link>
            {contract.project && (
              <>
                {" · "}
                <Link href={`/admin/projetos?projeto=${contract.project.id}`}>{contract.project.name}</Link>
              </>
            )}
          </>
        }
        back={{ href: "/admin/contratos", label: "Contratos" }}
        actions={
          <>
            <a href={`/api/contratos/${contract.id}/pdf`} target="_blank" rel="noopener noreferrer" className="adm-btn ghost">
              {contract.status === "assinado" ? "Ver PDF assinado ↗" : "Pré-visualizar PDF ↗"}
            </a>
            <a href={`/api/contratos/${contract.id}/pdf?baixar`} className="adm-btn ghost">
              Baixar
            </a>
          </>
        }
      />

      <div className="adm-detail">
        <div className="adm-modal-main">
          {contract.status === "assinado" ? (
            <section className="adm-card adm-signed">
              <h2>✓ Contrato assinado</h2>
              <dl className="adm-dl">
                <dt>Assinante</dt>
                <dd>{contract.signerName}</dd>
                <dt>CPF/CNPJ</dt>
                <dd>{formatCpfCnpj(contract.signerDocument)}</dd>
                <dt>E-mail</dt>
                <dd>{contract.signerEmail}</dd>
                <dt>Data</dt>
                <dd>{dateTime(contract.signedAt)}</dd>
                <dt>IP</dt>
                <dd>{contract.signerIp}</dd>
                <dt>Código</dt>
                <dd className="adm-mono">{verificationCode(contract.contentHash ?? "")}</dd>
              </dl>
              {contract.signatureImage && <img src={contract.signatureImage} alt="Assinatura do cliente" className="adm-signature" />}
            </section>
          ) : (
            <section className="adm-card">
              <h2>Enviar para assinatura</h2>
              {missing.length > 0 && (
                <p className="adm-alert">
                  Complete o cadastro do cliente antes de enviar: falta {missing.join(", ")}.{" "}
                  <Link href={`/admin/clientes/${contract.clientId}`}>Abrir cliente →</Link>
                </p>
              )}
              <p className="adm-card-sub">
                {emailConfigured()
                  ? `O cliente recebe por e-mail (${contract.client.email ?? "sem e-mail"}) o link para ler e assinar, com a minuta em PDF anexada.`
                  : "O e-mail ainda não está configurado: o portal gera o link para você enviar pelo WhatsApp ou pelo seu e-mail."}
              </p>
              {sendable && (
                <ActionButton action={sendContract.bind(null, contract.id)} pendingText="Enviando...">
                  {contract.sentAt ? "Reenviar para assinatura" : "Enviar para assinatura"}
                </ActionButton>
              )}
              {contract.sentAt && (
                <CopyLink
                  url={link}
                  phone={contract.client.phone}
                  message={`Olá, ${contract.client.name.split(" ")[0]}! Segue o contrato ${contract.number} da Gardsoft para leitura e assinatura:`}
                />
              )}
            </section>
          )}

          {editable ? (
            <section className="adm-card">
              <h2>Editar contrato</h2>
              {contract.sentAt && (
                <p className="adm-card-sub">Alterar um contrato já enviado invalida o link anterior e exige um novo envio.</p>
              )}
              <ActionForm action={saveContract.bind(null, contract.id)} submitLabel="Salvar contrato">
                <ContractFields
                  clients={clients}
                  projects={projects}
                  contract={{ ...contract, paymentPlan: plan.success ? plan.data : [] }}
                />
              </ActionForm>
            </section>
          ) : (
            <section className="adm-card">
              <h2>Escopo</h2>
              <p className="adm-prewrap">{contract.scope}</p>
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
              <h2>Pagamento</h2>
              <b>{money(contract.valueCents)}</b>
            </div>
            {contract.entries.length > 0 ? (
              <ul className="adm-list compact">
                {contract.entries.map((e) => (
                  <li key={e.id}>
                    <Link href={`/admin/financeiro/lancamento/${e.id}`}>
                      <span>
                        <strong>{money(e.amountCents)}</strong>
                        <small>Vence {shortDate(e.dueDate.toISOString().slice(0, 10))}</small>
                      </span>
                      <EntryBadge status={e.status} dueDate={e.dueDate} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <ul className="adm-list compact">
                  {(plan.success ? plan.data : []).map((p, i) => (
                    <li key={i}>
                      <div>
                        <span>
                          <strong>{p.label}</strong>
                          <small>Vence {shortDate(p.dueDate)}</small>
                        </span>
                        <b>{money(p.amountCents)}</b>
                      </div>
                    </li>
                  ))}
                </ul>
                {contract.status === "assinado" && (
                  <ActionButton action={generateCharges.bind(null, contract.id)} pendingText="Gerando...">
                    {asaasConfigured() ? "Gerar cobranças no Asaas" : "Lançar em Contas a receber"}
                  </ActionButton>
                )}
              </>
            )}
          </section>

          {editable && (
            <ConfirmButton action={cancelContract.bind(null, contract.id)} confirm="Cancelar este contrato? O link de assinatura deixa de funcionar." className="adm-btn danger ghost">
              Cancelar contrato
            </ConfirmButton>
          )}
          {contract.status !== "assinado" && (
            <ConfirmButton action={deleteContract.bind(null, contract.id)} confirm="Excluir este contrato definitivamente?" className="adm-btn danger ghost">
              Excluir contrato
            </ConfirmButton>
          )}
        </aside>
      </div>
    </>
  );
}
