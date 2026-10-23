import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Listas dos seletores do formulário de orçamento. Leads perdidos ou já convertidos ficam de fora,
 * exceto o lead já vinculado ao orçamento (senão ele se perderia ao salvar).
 */
export async function quoteOptions(currentLeadId?: string | null) {
  const [clients, leads, projects] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true, company: true }, orderBy: { name: "asc" } }),
    prisma.lead.findMany({
      where: { OR: [{ status: { notIn: ["perdido", "fechado"] } }, ...(currentLeadId ? [{ id: currentLeadId }] : [])] },
      select: { id: true, name: true, company: true },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return { clients, leads, projects };
}
