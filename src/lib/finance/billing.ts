import "server-only";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logSystem } from "@/lib/activity";
import { asaasConfigured, createCustomer, createPayment, PAID_STATUSES, scheduleInvoice } from "@/lib/integrations/asaas";
import { emailConfigured, emailLayout, sendEmail } from "@/lib/integrations/email";
import { money, paymentPlanSchema } from "./contract";
import { getFinanceSettings } from "./settings";

const dateOnly = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const todayIso = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

/** Cria as contas a receber do plano de pagamento do contrato (uma vez só). */
export async function createEntriesFromContract(contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    select: { id: true, number: true, title: true, clientId: true, projectId: true, paymentPlan: true, _count: { select: { entries: true } } },
  });
  if (!contract || contract._count.entries > 0) return [];
  const plan = paymentPlanSchema.parse(contract.paymentPlan);
  const groupId = randomUUID();
  const ids: string[] = [];
  for (const [i, p] of plan.entries()) {
    const entry = await prisma.financeEntry.create({
      data: {
        type: "receber",
        description: `${contract.number} · ${p.label} — ${contract.title}`,
        category: "Projetos",
        amountCents: p.amountCents,
        dueDate: dateOnly(p.dueDate),
        clientId: contract.clientId,
        projectId: contract.projectId,
        contractId: contract.id,
        installmentNumber: i + 1,
        installmentTotal: plan.length,
        groupId,
      },
      select: { id: true },
    });
    ids.push(entry.id);
  }
  return ids;
}

/** Garante o cliente no Asaas (exige CPF/CNPJ no cadastro). */
async function ensureAsaasCustomer(clientId: string) {
  const client = await prisma.client.findUniqueOrThrow({ where: { id: clientId } });
  if (client.asaasCustomerId) return client.asaasCustomerId;
  if (!client.document) throw new Error("Cadastre o CPF/CNPJ do cliente para gerar cobranças no Asaas.");
  const created = await createCustomer({
    name: client.company ?? client.name,
    cpfCnpj: client.document,
    email: client.email,
    mobilePhone: client.phone,
    postalCode: client.zipCode,
    address: client.address,
    externalReference: client.id,
  });
  await prisma.client.update({ where: { id: clientId }, data: { asaasCustomerId: created.id } });
  return created.id;
}

/** Gera boleto/Pix no Asaas para uma conta a receber. */
export async function createAsaasCharge(entryId: string) {
  if (!asaasConfigured()) throw new Error("Asaas não configurado. Veja Financeiro → Configurações.");
  const entry = await prisma.financeEntry.findUniqueOrThrow({ where: { id: entryId } });
  if (entry.type !== "receber") throw new Error("Cobranças são geradas apenas para contas a receber.");
  if (entry.asaasPaymentId) return entry;
  if (!entry.clientId) throw new Error("Vincule um cliente ao lançamento para gerar a cobrança.");
  const settings = await getFinanceSettings();
  const customer = await ensureAsaasCustomer(entry.clientId);
  const due = entry.dueDate.toISOString().slice(0, 10);
  const payment = await createPayment({
    customer,
    billingType: settings.billing.method,
    valueCents: entry.amountCents,
    dueDate: due < todayIso() ? todayIso() : due,
    description: entry.description,
    externalReference: entry.id,
    finePercent: settings.billing.finePercent,
    interestPercent: settings.billing.interestPercent,
  });
  return prisma.financeEntry.update({
    where: { id: entryId },
    data: {
      asaasPaymentId: payment.id,
      asaasStatus: payment.status,
      invoiceUrl: payment.invoiceUrl,
      bankSlipUrl: payment.bankSlipUrl ?? null,
      method: settings.billing.method === "PIX" ? "pix" : "boleto",
    },
  });
}

/** Envia a cobrança (link da fatura com boleto/Pix) ao e-mail do cliente. */
export async function emailCharge(entryId: string) {
  if (!emailConfigured()) throw new Error("Envio de e-mail não configurado. Veja Financeiro → Configurações.");
  const entry = await prisma.financeEntry.findUniqueOrThrow({ where: { id: entryId }, include: { client: true } });
  if (!entry.client?.email) throw new Error("O cliente não tem e-mail cadastrado.");
  const link = entry.invoiceUrl ?? entry.bankSlipUrl;
  if (!link) throw new Error("Gere a cobrança antes de enviar.");
  const due = entry.dueDate.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  await sendEmail({
    to: entry.client.email,
    subject: `Cobrança Gardsoft — ${money(entry.amountCents)} com vencimento em ${due}`,
    html: emailLayout({
      title: "Sua cobrança está disponível",
      paragraphs: [
        `Olá, ${entry.client.name.split(" ")[0]}!`,
        `Segue a cobrança referente a: ${entry.description}.`,
        `Valor: ${money(entry.amountCents)} · Vencimento: ${due}.`,
        "No link abaixo você pode pagar por boleto ou Pix. Assim que o pagamento for confirmado, você recebe a confirmação por e-mail.",
      ],
      button: { label: "Ver boleto / Pix", url: link },
    }),
  });
}

/** Baixa do pagamento (manual ou pelo webhook) e, se configurado, emissão da nota. */
export async function markEntryPaid(
  entryId: string,
  input: { paidAt?: string; paidAmountCents?: number; method?: string | null; source: string },
) {
  const entry = await prisma.financeEntry.findUniqueOrThrow({ where: { id: entryId }, include: { client: true } });
  if (entry.status === "pago") return entry;
  const updated = await prisma.financeEntry.update({
    where: { id: entryId },
    data: {
      status: "pago",
      paidAt: dateOnly(input.paidAt ?? todayIso()),
      paidAmountCents: input.paidAmountCents ?? entry.amountCents,
      method: input.method ?? entry.method,
    },
  });
  if (entry.type === "receber") {
    const settings = await getFinanceSettings();
    if (settings.invoice.autoIssue && entry.asaasPaymentId && !entry.asaasInvoiceId) {
      await issueEntryInvoice(entryId).catch((e) => logSystem("erro", "financeiro", `Não emitiu a nota fiscal: ${e.message}`, entryId));
    }
    if (emailConfigured() && entry.client?.email) {
      await sendEmail({
        to: entry.client.email,
        subject: `Pagamento confirmado — ${money(updated.paidAmountCents ?? entry.amountCents)}`,
        html: emailLayout({
          title: "Pagamento confirmado ✓",
          paragraphs: [
            `Olá, ${entry.client.name.split(" ")[0]}! Recebemos o seu pagamento.`,
            `${entry.description} · ${money(updated.paidAmountCents ?? entry.amountCents)}.`,
            "Obrigado pela parceria!",
          ],
        }),
      }).catch((e) => logSystem("erro", "financeiro", `Não enviou o e-mail de confirmação: ${e.message}`, entryId));
    }
  }
  if (input.source !== "manual") {
    await logSystem("recebeu", "financeiro", `Confirmou o pagamento via ${input.source}: ${entry.description}`, entryId);
  }
  return updated;
}

/** Agenda a NFS-e no Asaas para um recebimento. */
export async function issueEntryInvoice(entryId: string) {
  if (!asaasConfigured()) throw new Error("Asaas não configurado.");
  const entry = await prisma.financeEntry.findUniqueOrThrow({ where: { id: entryId } });
  if (entry.asaasInvoiceId) return entry;
  if (!entry.asaasPaymentId) throw new Error("A nota é emitida a partir de uma cobrança gerada no Asaas.");
  const settings = await getFinanceSettings();
  const invoice = await scheduleInvoice({
    payment: entry.asaasPaymentId,
    valueCents: entry.paidAmountCents ?? entry.amountCents,
    serviceDescription: settings.invoice.description.replaceAll("{descricao}", entry.description),
    observations: entry.description,
    municipalServiceCode: settings.invoice.municipalServiceCode,
    municipalServiceName: settings.invoice.municipalServiceName,
    issPercent: settings.invoice.issPercent,
    retainIss: settings.invoice.retainIss,
    externalReference: entry.id,
  });
  return prisma.financeEntry.update({
    where: { id: entryId },
    data: { asaasInvoiceId: invoice.id, nfStatus: invoice.status, nfNumber: invoice.number ?? null, nfPdfUrl: invoice.pdfUrl ?? null, nfXmlUrl: invoice.xmlUrl ?? null },
  });
}

export { PAID_STATUSES };
