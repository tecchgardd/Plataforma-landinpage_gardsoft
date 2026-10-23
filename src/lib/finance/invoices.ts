import "server-only";
import { prisma } from "@/lib/prisma";
import type { AsaasInvoice } from "@/lib/integrations/asaas";

const todayDate = () => new Date(`${new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10)}T00:00:00.000Z`);

/** Status do Asaas → situação da nota no portal. */
export function statusFromAsaas(status: string) {
  switch (status) {
    case "AUTHORIZED":
    case "PROCESSING_CANCELLATION":
    case "CANCELLATION_DENIED":
      return "emitida";
    case "CANCELED":
      return "cancelada";
    case "ERROR":
      return "erro";
    default:
      return "pendente";
  }
}

/** Grava na nota o que o Asaas devolveu (webhook, sincronização ou emissão). */
export async function applyAsaasInvoice(invoiceId: string, nf: AsaasInvoice) {
  const current = await prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId } });
  const status = statusFromAsaas(nf.status);
  return prisma.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      asaasStatus: nf.status,
      number: nf.number ?? current.number,
      pdfUrl: nf.pdfUrl ?? current.pdfUrl,
      xmlUrl: nf.xmlUrl ?? current.xmlUrl,
      errorMessage: status === "erro" ? (nf.statusDescription ?? "Erro informado pela prefeitura.") : null,
      issueDate: status === "emitida" && !current.issueDate ? todayDate() : current.issueDate,
      cancelledAt: status === "cancelada" && !current.cancelledAt ? new Date() : current.cancelledAt,
    },
  });
}
