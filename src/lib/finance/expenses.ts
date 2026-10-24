import "server-only";
import { prisma } from "@/lib/prisma";
import { expenseTypes, labelOf } from "@/lib/admin/options";

/** Quantos dias à frente as contas a pagar das despesas recorrentes ficam lançadas. */
const HORIZON_DAYS = 45;

type Schedule = {
  frequency: string;
  dueDay: number | null;
  startDate: Date;
  endDate: Date | null;
};

const iso = (d: Date) => d.toISOString().slice(0, 10);
export const todayIso = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const addDays = (isoDate: string, days: number) => iso(new Date(new Date(`${isoDate}T00:00:00Z`).getTime() + days * 864e5));

/** Mesma data N meses depois, no dia de vencimento (31 vira o último dia em meses curtos). */
export function shiftMonths(isoDate: string, months: number, day?: number | null) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day ?? d, last));
  return iso(first);
}

/** Vencimentos de uma despesa depois de `after` (exclusivo) até `until` (inclusivo). */
export function dueDates(expense: Schedule, after: string | null, until: string) {
  const start = iso(expense.startDate);
  const end = expense.endDate ? iso(expense.endDate) : null;
  if (expense.frequency === "unica") return !after || start > after ? [start] : [];
  const step = expense.frequency === "anual" ? 12 : 1;
  const out: string[] = [];
  for (let i = 0; i < 600; i++) {
    const date = shiftMonths(start, i * step, expense.dueDay);
    if (date > until || (end && date > end)) break;
    if (!after || date > after) out.push(date);
  }
  return out;
}

/** Valor equivalente por mês (anual ÷ 12; única não entra no custo fixo). */
export function monthlyCost(e: { frequency: string; amountCents: number }) {
  return e.frequency === "mensal" ? e.amountCents : e.frequency === "anual" ? Math.round(e.amountCents / 12) : 0;
}

/** Próximo vencimento a partir de hoje (null quando já terminou). */
export function nextDueDate(expense: Schedule & { active: boolean }) {
  if (!expense.active) return null;
  const today = todayIso();
  return dueDates(expense, addDays(today, -1), addDays(today, 800))[0] ?? null;
}

type ExpenseRow = Schedule & {
  id: string;
  name: string;
  kind: string;
  supplier: string | null;
  amountCents: number;
  method: string | null;
  account: string | null;
  generatedUntil: Date | null;
};

/**
 * Lança em contas a pagar os vencimentos que ainda não foram gerados.
 * `generatedUntil` marca o último lançado: uma conta excluída à mão não volta.
 */
async function generate(expense: ExpenseRow) {
  const today = todayIso();
  const start = iso(expense.startDate);
  // Sempre lança ao menos o primeiro vencimento, mesmo que esteja longe (ex.: domínio anual).
  const until = [addDays(today, HORIZON_DAYS), start].sort().at(-1)!;
  const after = expense.generatedUntil ? iso(expense.generatedUntil) : null;
  const dates = dueDates(expense, after, until);
  if (dates.length === 0) return 0;
  const last = dates.at(-1)!;
  return prisma.$transaction(async (tx) => {
    // Reserva o intervalo: se outra requisição já gerou, não duplica.
    const claimed = await tx.expense.updateMany({
      where: { id: expense.id, generatedUntil: expense.generatedUntil },
      data: { generatedUntil: new Date(`${last}T00:00:00Z`) },
    });
    if (claimed.count === 0) return 0;
    await tx.financeEntry.createMany({
      data: dates.map((date) => ({
        type: "pagar",
        description: expense.name,
        category: labelOf(expenseTypes, expense.kind),
        amountCents: expense.amountCents,
        dueDate: new Date(`${date}T00:00:00Z`),
        supplier: expense.supplier,
        method: expense.method,
        account: expense.account,
        expenseId: expense.id,
      })),
    });
    return dates.length;
  });
}

/** Gera as contas a pagar de uma despesa (após criar ou reativar). */
export async function generateExpenseEntries(id: string) {
  const expense = await prisma.expense.findUnique({ where: { id } });
  if (!expense?.active) return 0;
  return generate(expense);
}

/** Roda ao abrir o financeiro: mantém as recorrências lançadas até o horizonte. */
export async function syncRecurringExpenses() {
  const horizon = new Date(`${addDays(todayIso(), HORIZON_DAYS)}T00:00:00Z`);
  const due = await prisma.expense.findMany({
    where: {
      active: true,
      frequency: { in: ["mensal", "anual"] },
      OR: [{ generatedUntil: null }, { generatedUntil: { lt: horizon } }],
    },
  });
  for (const expense of due) {
    await generate(expense).catch((error) => console.error("[financeiro] Recorrência", expense.id, error));
  }
}

/**
 * Remove as contas a pagar ainda em aberto, de hoje em diante (ao encerrar, excluir ou
 * mudar a periodicidade) e devolve a marca de geração para o último vencimento que ficou.
 */
export async function clearFutureEntries(id: string) {
  const today = new Date(`${todayIso()}T00:00:00Z`);
  const removed = await prisma.financeEntry.deleteMany({ where: { expenseId: id, status: "pendente", dueDate: { gte: today } } });
  const lastKept = await prisma.financeEntry.findFirst({ where: { expenseId: id }, orderBy: { dueDate: "desc" }, select: { dueDate: true } });
  const yesterday = new Date(today.getTime() - 864e5);
  const mark = lastKept && lastKept.dueDate > yesterday ? lastKept.dueDate : yesterday;
  await prisma.expense.updateMany({ where: { id }, data: { generatedUntil: mark } });
  return removed.count;
}

/** "Mensal · dia 10", "Anual · 15/03", "Única · 20/11/2026". */
export function scheduleLabel(e: { frequency: string; dueDay: number | null; dueMonth: number | null; startDate: Date }) {
  if (e.frequency === "mensal") return `Mensal · dia ${e.dueDay ?? e.startDate.getUTCDate()}`;
  if (e.frequency === "anual") {
    const day = String(e.dueDay ?? e.startDate.getUTCDate()).padStart(2, "0");
    const month = String(e.dueMonth ?? e.startDate.getUTCMonth() + 1).padStart(2, "0");
    return `Anual · ${day}/${month}`;
  }
  return `Única · ${e.startDate.toLocaleDateString("pt-BR", { timeZone: "UTC" })}`;
}
