import type { Prisma } from "@/lib/prisma";
import { money, shortDate } from "@/lib/admin/format";
import { labelOf, paymentMethods } from "@/lib/admin/options";

export const views = [
  { value: "abertos", label: "Em aberto" },
  { value: "vencidos", label: "Vencidos" },
  { value: "pagos", label: "Pagos" },
  { value: "todos", label: "Todos" },
] as const;

export type ListSearch = { situacao?: string; mes?: string; q?: string; aviso?: string };

export const todayUtc = () => new Date(`${new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10)}T00:00:00Z`);
export const isoDay = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");

/** Lê ?mes=AAAA-MM (aceita meses futuros, para vencimentos). */
export function monthRange(mes?: string) {
  if (!mes || !/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) return null;
  const [y, m] = mes.split("-").map(Number);
  return { key: mes, gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
}

/** Filtro comum das listas: tipo, situação (aba), mês de vencimento e busca. */
export function entryWhere(type: "receber" | "pagar", sp: ListSearch, defaultView: (typeof views)[number]["value"] = "abertos") {
  const view = views.find((v) => v.value === sp.situacao)?.value ?? defaultView;
  const month = monthRange(sp.mes);
  const base: Prisma.FinanceEntryWhereInput = { type };
  if (month) base.dueDate = { gte: month.gte, lt: month.lt };
  const q = sp.q?.trim();
  if (q) {
    const like = { contains: q, mode: "insensitive" as const };
    base.OR = [{ description: like }, { supplier: like }, { category: like }, { client: { name: like } }, { client: { company: like } }];
  }
  const where: Prisma.FinanceEntryWhereInput =
    view === "abertos"
      ? { ...base, status: "pendente" }
      : view === "vencidos"
        ? { ...base, status: "pendente", dueDate: { ...(base.dueDate as object), lt: todayUtc() } }
        : view === "pagos"
          ? { ...base, status: "pago" }
          : base;
  return { where, view, month: month?.key ?? null, q };
}

export function hrefWith(path: string, current: Record<string, string | null | undefined>, changes: Record<string, string | undefined>) {
  const next = { ...current, ...changes };
  const s = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => Boolean(e[1]))).toString();
  return `${path}${s ? `?${s}` : ""}`;
}

const statusText = (status: string, dueDate: Date) =>
  status === "pendente" && isoDay(dueDate) < isoDay(todayUtc()) ? "Vencido" : ({ pago: "Pago", pendente: "Pendente", cancelado: "Cancelado" }[status] ?? status);

type RowEntry = {
  id: string;
  description: string;
  category: string;
  amountCents: number;
  paidAmountCents: number | null;
  dueDate: Date;
  paidAt: Date | null;
  status: string;
  method: string | null;
  account: string | null;
  supplier: string | null;
  invoiceUrl?: string | null;
  client?: { name: string; company: string | null } | null;
};

const partyOf = (e: RowEntry) => (e.client ? (e.client.company ?? e.client.name) : (e.supplier ?? ""));

/** Linha para exportar/compartilhar na tabela com seleção. */
export function bulkRow(e: RowEntry) {
  const paid = e.status === "pago";
  const value = paid ? (e.paidAmountCents ?? e.amountCents) : e.amountCents;
  return {
    id: e.id,
    csv: {
      Descrição: e.description,
      Categoria: e.category,
      "Cliente / fornecedor": partyOf(e),
      Vencimento: isoDay(e.dueDate).split("-").reverse().join("/"),
      Valor: (e.amountCents / 100).toFixed(2).replace(".", ","),
      Situação: statusText(e.status, e.dueDate),
      "Pago em": e.paidAt ? isoDay(e.paidAt).split("-").reverse().join("/") : "",
      "Valor pago": paid ? (value / 100).toFixed(2).replace(".", ",") : "",
      Forma: e.method ? labelOf(paymentMethods, e.method) : "",
      Conta: e.account ?? "",
      "Link de pagamento": e.invoiceUrl ?? "",
    },
    share: [
      e.description,
      partyOf(e),
      money(value),
      paid ? `pago em ${shortDate(isoDay(e.paidAt))}` : `vence ${shortDate(isoDay(e.dueDate))}`,
      e.invoiceUrl && !paid ? e.invoiceUrl : "",
    ]
      .filter(Boolean)
      .join(" · "),
  };
}
