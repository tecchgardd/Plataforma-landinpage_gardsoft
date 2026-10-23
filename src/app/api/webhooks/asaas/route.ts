import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logSystem } from "@/lib/activity";
import { markEntryPaid } from "@/lib/finance/billing";

/**
 * Webhook do Asaas. Configure no painel do Asaas:
 *   URL: https://SEU-DOMINIO/api/webhooks/asaas
 *   Token de autenticação: o mesmo valor de ASAAS_WEBHOOK_TOKEN
 * Eventos: cobranças (PAYMENT_*) e notas fiscais (INVOICE_*).
 */

type Payload = {
  id?: string;
  event?: string;
  payment?: { id: string; status: string; value: number; paymentDate?: string; clientPaymentDate?: string; billingType?: string; invoiceUrl?: string; bankSlipUrl?: string };
  invoice?: { id: string; status: string; number?: string; pdfUrl?: string; xmlUrl?: string; statusDescription?: string };
};

function authorized(request: Request) {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;
  const received = request.headers.get("asaas-access-token");
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

const methodOf = (billingType?: string) =>
  billingType === "PIX" ? "pix" : billingType === "CREDIT_CARD" ? "cartao" : billingType === "BOLETO" ? "boleto" : null;

export async function POST(request: Request) {
  if (!authorized(request)) return new Response("Unauthorized", { status: 401 });
  const body = (await request.json().catch(() => null)) as Payload | null;
  if (!body?.event) return Response.json({ ok: true });

  // Idempotência: o Asaas pode reenviar o mesmo evento.
  if (body.id) {
    const seen = await prisma.webhookEvent.findUnique({ where: { id: body.id } });
    if (seen) return Response.json({ ok: true, duplicate: true });
  }

  try {
    if (body.payment) {
      const entry = await prisma.financeEntry.findUnique({ where: { asaasPaymentId: body.payment.id } });
      if (entry) {
        await prisma.financeEntry.update({
          where: { id: entry.id },
          data: {
            asaasStatus: body.payment.status,
            invoiceUrl: body.payment.invoiceUrl ?? entry.invoiceUrl,
            bankSlipUrl: body.payment.bankSlipUrl ?? entry.bankSlipUrl,
          },
        });
        switch (body.event) {
          case "PAYMENT_CONFIRMED":
          case "PAYMENT_RECEIVED":
            await markEntryPaid(entry.id, {
              paidAt: body.payment.clientPaymentDate ?? body.payment.paymentDate,
              paidAmountCents: Math.round(body.payment.value * 100),
              method: methodOf(body.payment.billingType),
              source: "Asaas",
            });
            break;
          case "PAYMENT_OVERDUE":
            await logSystem("venceu", "financeiro", `Cobrança vencida sem pagamento: ${entry.description}`, entry.id);
            break;
          case "PAYMENT_DELETED":
            if (entry.status === "pendente") await prisma.financeEntry.update({ where: { id: entry.id }, data: { status: "cancelado" } });
            await logSystem("cancelou", "financeiro", `Cobrança removida no Asaas: ${entry.description}`, entry.id);
            break;
          case "PAYMENT_REFUNDED":
          case "PAYMENT_RECEIVED_IN_CASH_UNDONE":
            await prisma.financeEntry.update({ where: { id: entry.id }, data: { status: "pendente", paidAt: null, paidAmountCents: null } });
            await logSystem("estornou", "financeiro", `Pagamento estornado: ${entry.description}`, entry.id);
            break;
        }
      }
    }

    if (body.invoice) {
      const entry = await prisma.financeEntry.findUnique({ where: { asaasInvoiceId: body.invoice.id } });
      if (entry) {
        await prisma.financeEntry.update({
          where: { id: entry.id },
          data: {
            nfStatus: body.invoice.status,
            nfNumber: body.invoice.number ?? entry.nfNumber,
            nfPdfUrl: body.invoice.pdfUrl ?? entry.nfPdfUrl,
            nfXmlUrl: body.invoice.xmlUrl ?? entry.nfXmlUrl,
          },
        });
        if (body.event === "INVOICE_AUTHORIZED")
          await logSystem("emitiu", "financeiro", `Nota fiscal ${body.invoice.number ?? ""} autorizada: ${entry.description}`, entry.id);
        if (body.event === "INVOICE_ERROR")
          await logSystem("erro", "financeiro", `Erro na nota fiscal (${body.invoice.statusDescription ?? "sem detalhes"}): ${entry.description}`, entry.id);
      }
    }

    if (body.id) await prisma.webhookEvent.create({ data: { id: body.id, source: "asaas", event: body.event } });
  } catch (error) {
    console.error("Webhook Asaas", error);
    // Erro 500 faz o Asaas tentar de novo mais tarde.
    return new Response("Error", { status: 500 });
  }
  return Response.json({ ok: true });
}
