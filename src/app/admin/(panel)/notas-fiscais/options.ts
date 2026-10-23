import "server-only";
import { prisma } from "@/lib/prisma";

/** Clientes e recebimentos pagos ainda sem nota (mais o já vinculado à nota em edição). */
export async function invoiceOptions(currentEntryId?: string | null) {
  const [clients, entries] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true, company: true }, orderBy: { name: "asc" } }),
    prisma.financeEntry.findMany({
      where: { OR: [{ type: "receber", status: "pago", invoice: null }, ...(currentEntryId ? [{ id: currentEntryId }] : [])] },
      select: { id: true, description: true, amountCents: true },
      orderBy: { paidAt: "desc" },
      take: 200,
    }),
  ]);
  return { clients, entries };
}
