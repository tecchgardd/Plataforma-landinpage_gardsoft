import "server-only";
import { prisma } from "@/lib/prisma";

export type Sale = { projectId: string; service: string | null; valueCents: number; soldAt: Date };

/**
 * Projetos vendidos no período. Projeto só é venda quando há prova de fechamento:
 * - orçamento aprovado pelo cliente (data: aprovação), ou
 * - contrato assinado (data: assinatura), ou
 * - lead de origem marcado como "Projeto fechado" (data: criação do projeto, feita no "Fechar negócio").
 * Vale a primeira dessas datas. Projeto criado durante a negociação (lead em contato/negociação,
 * orçamento em rascunho ou enviado) não entra até uma delas acontecer.
 */
export async function salesBetween(start: Date, end: Date): Promise<Sale[]> {
  const projects = await prisma.project.findMany({
    where: {
      OR: [
        { quotes: { some: { status: "aprovado", decidedAt: { not: null } } } },
        { contracts: { some: { status: "assinado", signedAt: { not: null } } } },
        { lead: { status: "fechado" } },
      ],
    },
    select: {
      id: true,
      service: true,
      valueCents: true,
      createdAt: true,
      lead: { select: { status: true } },
      quotes: { where: { status: "aprovado", decidedAt: { not: null } }, select: { decidedAt: true, totalCents: true } },
      contracts: { where: { status: "assinado", signedAt: { not: null } }, select: { signedAt: true, valueCents: true } },
    },
  });

  const sales: Sale[] = [];
  for (const p of projects) {
    const proofs = [
      ...p.quotes.map((q) => q.decidedAt!),
      ...p.contracts.map((c) => c.signedAt!),
      ...(p.lead?.status === "fechado" ? [p.createdAt] : []),
    ];
    const soldAt = new Date(Math.min(...proofs.map((d) => d.getTime())));
    if (soldAt < start || soldAt >= end) continue;
    // Valor do projeto; se não foi preenchido, o do orçamento aprovado ou do contrato assinado.
    const valueCents = p.valueCents || p.quotes[0]?.totalCents || p.contracts[0]?.valueCents || 0;
    sales.push({ projectId: p.id, service: p.service, valueCents, soldAt });
  }
  return sales;
}
