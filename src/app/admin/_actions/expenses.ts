"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { parseMoney } from "@/lib/admin/format";
import { expenseTypes, labelOf, paymentMethods } from "@/lib/admin/options";
import { firstError, formObject, optionalText, type FormState } from "@/lib/admin/form";
import { money } from "@/lib/finance/contract";
import { clearFutureEntries, generateExpenseEntries, shiftMonths, todayIso } from "@/lib/finance/expenses";

const refresh = () => revalidatePath("/admin", "layout");

const expenseSchema = z
  .object({
    name: z.string().trim().min(2, "Dê um nome à despesa.").max(120),
    kind: z.string().refine((v) => expenseTypes.some((t) => t.value === v), "Escolha o tipo da despesa."),
    supplier: optionalText(120),
    amount: z
      .string()
      .transform(parseMoney)
      .refine((v) => v > 0, "Informe o valor."),
    frequency: z.enum(["mensal", "anual", "unica"], { message: "Escolha a periodicidade." }),
    dueDay: z.string().optional(),
    startMonth: z.string().optional(),
    dueDate: z.string().optional(),
    endMonth: z.string().optional(),
    method: z
      .string()
      .trim()
      .refine((v) => !v || paymentMethods.some((m) => m.value === v), "Forma de pagamento inválida.")
      .transform((v) => v || null),
    account: optionalText(80),
    url: z
      .string()
      .trim()
      .max(500)
      .refine((v) => !v || /^https?:\/\//i.test(v), "O link precisa começar com http:// ou https://.")
      .transform((v) => v || null),
    notes: optionalText(4000),
  })
  .transform((data, ctx) => {
    const fail = (message: string) => {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    };
    const isMonth = (v?: string) => Boolean(v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v));
    const isDate = (v?: string) => Boolean(v && /^\d{4}-\d{2}-\d{2}$/.test(v));
    let start: string;
    let dueDay: number | null = null;
    let dueMonth: number | null = null;
    if (data.frequency === "mensal") {
      dueDay = Number(data.dueDay);
      if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) return fail("Informe o dia do vencimento (1 a 31).");
      if (!isMonth(data.startMonth)) return fail("Informe o mês da primeira cobrança.");
      start = shiftMonths(`${data.startMonth}-01`, 0, dueDay);
    } else {
      if (!isDate(data.dueDate)) return fail(data.frequency === "anual" ? "Informe a data do próximo vencimento." : "Informe a data de vencimento.");
      start = data.dueDate!;
      if (data.frequency === "anual") {
        dueDay = Number(start.slice(8, 10));
        dueMonth = Number(start.slice(5, 7));
      }
    }
    let end: string | null = null;
    if (data.frequency !== "unica" && data.endMonth) {
      if (!isMonth(data.endMonth)) return fail("Mês de término inválido.");
      end = shiftMonths(`${data.endMonth}-01`, 1, 1);
      end = new Date(new Date(`${end}T00:00:00Z`).getTime() - 864e5).toISOString().slice(0, 10); // último dia do mês
      if (end < start) return fail("O término precisa ser depois do primeiro vencimento.");
    }
    const { dueDay: _d, startMonth: _s, dueDate: _dd, endMonth: _e, amount, ...rest } = data;
    return {
      ...rest,
      amountCents: amount,
      dueDay,
      dueMonth,
      startDate: new Date(`${start}T00:00:00Z`),
      endDate: end ? new Date(`${end}T00:00:00Z`) : null,
    };
  });

export async function saveExpense(id: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("financeiro", 2);
  const parsed = expenseSchema.safeParse({ supplier: "", method: "", account: "", url: "", notes: "", ...formObject(formData) });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const data = parsed.data;

  if (!id) {
    const expense = await prisma.expense.create({ data, select: { id: true } });
    const count = await generateExpenseEntries(expense.id);
    await logActivity(user, "criou", "financeiro", `Cadastrou a despesa ${data.name} (${money(data.amountCents)}, ${data.frequency})`, expense.id);
    refresh();
    redirect(`/admin/financeiro/despesas/${expense.id}?lancadas=${count}`);
  }

  const current = await prisma.expense.findUnique({ where: { id } });
  if (!current) return { error: "Despesa não encontrada." };
  const scheduleChanged =
    current.frequency !== data.frequency ||
    current.dueDay !== data.dueDay ||
    current.startDate.getTime() !== data.startDate.getTime() ||
    (current.endDate?.getTime() ?? null) !== (data.endDate?.getTime() ?? null);
  await prisma.expense.update({ where: { id }, data });
  if (scheduleChanged) {
    // Datas mudaram: refaz os vencimentos em aberto de hoje em diante.
    await clearFutureEntries(id);
    await generateExpenseEntries(id);
  } else {
    // Mesmo calendário: atualiza nome, valor e forma de pagamento das contas ainda em aberto.
    await prisma.financeEntry.updateMany({
      where: { expenseId: id, status: "pendente", dueDate: { gte: new Date(`${todayIso()}T00:00:00Z`) } },
      data: {
        description: data.name,
        category: labelOf(expenseTypes, data.kind),
        amountCents: data.amountCents,
        supplier: data.supplier,
        method: data.method,
        account: data.account,
      },
    });
  }
  await logActivity(user, "editou", "financeiro", `Editou a despesa ${data.name}`, id);
  refresh();
  return { success: scheduleChanged ? "Despesa atualizada e vencimentos refeitos." : "Despesa atualizada. As contas em aberto também." };
}

async function setActive(ids: string[], active: boolean) {
  let count = 0;
  for (const id of ids) {
    const updated = await prisma.expense.updateMany({ where: { id, active: !active }, data: { active } });
    if (updated.count === 0) continue;
    count++;
    if (active) {
      await clearFutureEntries(id); // marca a partir de hoje, sem lançar meses que passaram
      await generateExpenseEntries(id);
    } else {
      await clearFutureEntries(id);
    }
  }
  return count;
}

export async function toggleExpense(id: string, active: boolean) {
  const user = await requireAccess("financeiro", 2);
  await setActive([id], active);
  const expense = await prisma.expense.findUnique({ where: { id }, select: { name: true } });
  await logActivity(user, active ? "reativou" : "encerrou", "financeiro", `${active ? "Reativou" : "Encerrou"} a despesa ${expense?.name}`, id);
  refresh();
}

export async function deleteExpense(id: string) {
  const user = await requireAccess("financeiro", 3);
  const expense = await prisma.expense.findUnique({ where: { id }, select: { name: true } });
  if (expense) {
    await clearFutureEntries(id);
    await prisma.expense.delete({ where: { id } });
    await logActivity(user, "excluiu", "financeiro", `Excluiu a despesa ${expense.name}`, id);
  }
  refresh();
  redirect("/admin/financeiro/despesas");
}

/** Ações da seleção na lista de despesas. */
export async function bulkExpenses(action: "encerrar" | "reativar" | "excluir", ids: string[]): Promise<FormState> {
  const user = await requireAccess("financeiro", action === "excluir" ? 3 : 2);
  const valid = ids.filter((id) => z.uuid().safeParse(id).success).slice(0, 500);
  if (valid.length === 0) return { error: "Nenhuma despesa selecionada." };
  let count = 0;
  if (action === "excluir") {
    for (const id of valid) {
      await clearFutureEntries(id);
      count += (await prisma.expense.deleteMany({ where: { id } })).count;
    }
  } else {
    count = await setActive(valid, action === "reativar");
  }
  const verb = { encerrar: "Encerrou", reativar: "Reativou", excluir: "Excluiu" }[action];
  await logActivity(user, verb.toLowerCase(), "financeiro", `${verb} ${count} despesa(s) em lote`);
  refresh();
  return { success: `${count} despesa(s) ${{ encerrar: "encerrada(s)", reativar: "reativada(s)", excluir: "excluída(s)" }[action]}.` };
}
