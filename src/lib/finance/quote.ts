import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { publicBaseUrl } from "./contract";

export const quoteItemSchema = z.object({
  description: z.string().trim().min(1).max(200),
  details: z.string().trim().max(2000).default(""),
  quantity: z.number().positive().max(10000),
  unitCents: z.number().int().min(0),
});
export const quoteItemsSchema = z.array(quoteItemSchema).min(1).max(60);
export type QuoteItem = z.infer<typeof quoteItemSchema>;

export const itemTotal = (item: QuoteItem) => Math.round(item.quantity * item.unitCents);
export const quoteSubtotal = (items: QuoteItem[]) => items.reduce((s, i) => s + itemTotal(i), 0);

/** Próximo número sequencial do ano: ORC-2026-0001. */
export async function nextQuoteNumber() {
  const year = new Date().getFullYear();
  const last = await prisma.quote.findFirst({
    where: { number: { startsWith: `ORC-${year}-` } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const seq = last ? Number(last.number.split("-")[2]) + 1 : 1;
  return `ORC-${year}-${String(seq).padStart(4, "0")}`;
}

export function quoteUrl(token: string) {
  return `${publicBaseUrl()}/orcamento/${token}`;
}

/** Enviado ou visto, com a validade já passada. */
export function isExpired(quote: { status: string; validUntil: Date | null }) {
  if (quote.status !== "enviado" && quote.status !== "visualizado") return false;
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  return Boolean(quote.validUntil && quote.validUntil.toISOString().slice(0, 10) < today);
}

/** Quem recebe o orçamento: o cliente cadastrado ou, antes de virar cliente, o lead. */
export function recipientOf(quote: {
  client: { name: string; company: string | null; email: string | null; phone: string | null; document?: string | null } | null;
  lead: { name: string; company: string | null; email: string | null; phone: string | null } | null;
}) {
  const r = quote.client ?? quote.lead;
  return {
    name: r?.name ?? "Cliente",
    company: r?.company ?? null,
    display: r ? (r.company ?? r.name) : "Cliente",
    email: r?.email ?? null,
    phone: r?.phone ?? null,
    document: quote.client?.document ?? null,
  };
}

/** Carrega o orçamento com o destinatário, no formato usado pelo PDF e pela página pública. */
export async function loadQuote(where: { id: string } | { token: string }) {
  const quote = await prisma.quote.findUnique({
    where,
    include: {
      client: { select: { id: true, name: true, company: true, email: true, phone: true, document: true, city: true, state: true } },
      lead: { select: { id: true, name: true, company: true, email: true, phone: true } },
      project: { select: { id: true, name: true } },
      contract: { select: { id: true, number: true, status: true } },
      createdBy: { select: { name: true } },
    },
  });
  if (!quote) return null;
  const items = quoteItemsSchema.safeParse(quote.items);
  return { quote, items: items.success ? items.data : [] };
}
