"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma, toDbDate, type Prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { readUpload } from "@/lib/files";
import { parseMoney } from "@/lib/admin/format";
import { paymentMethods } from "@/lib/admin/options";
import { firstError, formObject, optionalText, optionalUuid, type FormState } from "@/lib/admin/form";
import { createAsaasCharge, emailCharge, issueEntryInvoice, markEntryPaid } from "@/lib/finance/billing";
import { money } from "@/lib/finance/contract";
import { applyAsaasInvoice } from "@/lib/finance/invoices";
import { deletePayment, getInvoice, getPayment, PAID_STATUSES } from "@/lib/integrations/asaas";

const refresh = () => revalidatePath("/admin", "layout");
const errorText = (e: unknown) => (e instanceof Error ? e.message : "Erro inesperado.");

const entrySchema = z.object({
  type: z.enum(["receber", "pagar"]),
  description: z.string().trim().min(3, "Descreva o lançamento.").max(300),
  category: z.string().trim().min(1, "Escolha a categoria.").max(60),
  amount: z
    .string()
    .transform(parseMoney)
    .refine((v) => v > 0, "Informe o valor."),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe o vencimento."),
  method: z
    .string()
    .trim()
    .refine((v) => !v || paymentMethods.some((m) => m.value === v), "Forma de pagamento inválida.")
    .transform((v) => v || null),
  clientId: optionalUuid,
  projectId: optionalUuid,
  supplier: optionalText(120),
  account: optionalText(80),
  notes: optionalText(4000),
  repeat: z
    .string()
    .optional()
    .transform((v) => Math.min(60, Math.max(1, Number(v) || 1))),
  repeatMode: z.enum(["parcelas", "mensal"]).optional(),
  autoCharge: z.string().optional(),
  autoEmail: z.string().optional(),
});

/** Lista onde o lançamento aparece: cobranças (a receber) ou contas a pagar. */
const listOf = (type: string) => (type === "receber" ? "/admin/financeiro/cobrancas" : "/admin/financeiro/pagar");

function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(d, last));
  return date.toISOString().slice(0, 10);
}

export async function saveEntry(id: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("financeiro", 2);
  // Receitas não têm "fornecedor" e despesas não têm "cliente" no formulário.
  const parsed = entrySchema.safeParse({ clientId: "", supplier: "", projectId: "", method: "", account: "", notes: "", ...formObject(formData) });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { amount, dueDate, repeat, repeatMode, autoCharge, autoEmail, ...data } = parsed.data;
  const label = data.type === "receber" ? "cobrança" : "conta a pagar";

  if (id) {
    const current = await prisma.financeEntry.findUnique({ where: { id }, select: { asaasPaymentId: true, status: true } });
    if (!current) return { error: "Lançamento não encontrado." };
    if (current.asaasPaymentId && current.status === "pendente")
      return { error: "Este lançamento tem cobrança no Asaas. Cancele a cobrança para alterar valor ou vencimento." };
    await prisma.financeEntry.update({ where: { id }, data: { ...data, amountCents: amount, dueDate: toDbDate(dueDate)! } });
    await logActivity(user, "editou", "financeiro", `Editou ${label}: ${data.description}`, id);
    refresh();
    return { success: "Lançamento atualizado." };
  }

  // Parcelado: divide o valor. Mensal: repete o mesmo valor todo mês.
  const count = repeat;
  const groupId = count > 1 ? randomUUID() : null;
  const base = Math.floor(amount / (repeatMode === "parcelas" ? count : 1));
  const ids: string[] = [];
  for (let i = 0; i < count; i++) {
    const value = repeatMode === "parcelas" && i === count - 1 ? amount - base * (count - 1) : base;
    const entry = await prisma.financeEntry.create({
      data: {
        ...data,
        description: count > 1 ? `${data.description} (${i + 1}/${count})` : data.description,
        amountCents: value,
        dueDate: toDbDate(addMonths(dueDate, i))!,
        installmentNumber: count > 1 ? i + 1 : null,
        installmentTotal: count > 1 ? count : null,
        groupId,
      },
      select: { id: true },
    });
    ids.push(entry.id);
  }
  await logActivity(user, "criou", "financeiro", `Lançou ${label}: ${data.description} (${money(amount)}${count > 1 ? `, ${count}x` : ""})`, ids[0]);

  // Cobrança nova: já gera boleto/Pix (do 1º vencimento) e envia por e-mail, se marcado.
  let notice = "";
  if (data.type === "receber" && autoCharge) {
    try {
      await createAsaasCharge(ids[0]);
      if (autoEmail) await emailCharge(ids[0]);
    } catch (e) {
      notice = `?aviso=${encodeURIComponent(errorText(e))}`;
    }
  }
  refresh();
  redirect(count > 1 ? `${listOf(data.type)}${notice}` : `/admin/financeiro/lancamento/${ids[0]}${notice}`);
}

/** Baixa manual com comprovante opcional. */
export async function payEntry(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("financeiro", 2);
  const form = formObject(formData);
  const paidAt = /^\d{4}-\d{2}-\d{2}$/.test(form.paidAt ?? "") ? form.paidAt : undefined;
  const paidAmountCents = form.paidAmount ? parseMoney(form.paidAmount) : undefined;
  const method = paymentMethods.find((m) => m.value === form.method)?.value ?? null;
  const account = form.account?.slice(0, 80) || null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const upload = await readUpload(formData);
    if ("error" in upload) return { error: upload.error };
    await prisma.financeFile.create({ data: { entryId: id, kind: "comprovante", label: "Comprovante de pagamento", ...upload } });
  }
  try {
    const entry = await markEntryPaid(id, { paidAt, paidAmountCents, method, account, source: "manual" });
    await logActivity(user, "deu baixa", "financeiro", `Deu baixa em ${entry.description} (${money(entry.paidAmountCents ?? entry.amountCents)})`, id);
  } catch (e) {
    return { error: errorText(e) };
  }
  refresh();
  return { success: "Pagamento registrado." };
}

export async function reopenEntry(id: string) {
  const user = await requireAccess("financeiro", 2);
  const entry = await prisma.financeEntry.update({
    where: { id },
    data: { status: "pendente", paidAt: null, paidAmountCents: null },
    select: { description: true },
  });
  await logActivity(user, "reabriu", "financeiro", `Desfez a baixa de ${entry.description}`, id);
  refresh();
}

export async function cancelEntry(id: string, _: FormState): Promise<FormState> {
  const user = await requireAccess("financeiro", 2);
  const entry = await prisma.financeEntry.findUnique({ where: { id } });
  if (!entry) return { error: "Lançamento não encontrado." };
  if (entry.asaasPaymentId && entry.status === "pendente") {
    try {
      await deletePayment(entry.asaasPaymentId);
    } catch (e) {
      return { error: `Não foi possível cancelar no Asaas: ${errorText(e)}` };
    }
  }
  await prisma.financeEntry.update({ where: { id }, data: { status: "cancelado", asaasStatus: entry.asaasPaymentId ? "DELETED" : null } });
  await logActivity(user, "cancelou", "financeiro", `Cancelou ${entry.description}`, id);
  refresh();
  return { success: "Lançamento cancelado." };
}

export async function deleteEntry(id: string) {
  const user = await requireAccess("financeiro", 3);
  const entry = await prisma.financeEntry.findUnique({ where: { id }, select: { description: true, type: true, asaasPaymentId: true, status: true } });
  if (!entry) redirect("/admin/financeiro");
  if (entry.asaasPaymentId && entry.status === "pendente") redirect(`/admin/financeiro/lancamento/${id}?erro=asaas`);
  await prisma.financeEntry.delete({ where: { id } });
  await logActivity(user, "excluiu", "financeiro", `Excluiu o lançamento ${entry.description}`, id);
  refresh();
  redirect(listOf(entry.type));
}

/* ---------- Asaas ---------- */

export async function chargeEntry(id: string, _: FormState): Promise<FormState> {
  const user = await requireAccess("financeiro", 2);
  try {
    const entry = await createAsaasCharge(id);
    await logActivity(user, "cobrou", "financeiro", `Gerou boleto/Pix no Asaas: ${entry.description}`, id);
  } catch (e) {
    return { error: errorText(e) };
  }
  refresh();
  return { success: "Cobrança gerada no Asaas." };
}

export async function emailEntry(id: string, _: FormState): Promise<FormState> {
  const user = await requireAccess("financeiro", 2);
  try {
    await emailCharge(id);
  } catch (e) {
    return { error: errorText(e) };
  }
  const entry = await prisma.financeEntry.findUnique({ where: { id }, select: { description: true } });
  await logActivity(user, "enviou", "financeiro", `Enviou a cobrança por e-mail: ${entry?.description}`, id);
  return { success: "Cobrança enviada por e-mail." };
}

export async function invoiceEntry(id: string, _: FormState): Promise<FormState> {
  const user = await requireAccess("notas", 2);
  try {
    const invoice = await issueEntryInvoice(id);
    await logActivity(user, "emitiu", "notafiscal", `Solicitou a nota fiscal de ${invoice.description}`, invoice.id);
  } catch (e) {
    return { error: errorText(e) };
  }
  refresh();
  return { success: "Nota fiscal solicitada. Ela fica disponível quando a prefeitura autorizar." };
}

/** Atualiza status da cobrança e da nota direto do Asaas (caso algum aviso não tenha chegado). */
export async function syncEntry(id: string, _: FormState): Promise<FormState> {
  await requireAccess("financeiro", 2);
  const entry = await prisma.financeEntry.findUnique({ where: { id }, include: { invoice: { select: { id: true, asaasInvoiceId: true } } } });
  if (!entry?.asaasPaymentId) return { error: "Este lançamento não tem cobrança no Asaas." };
  try {
    const payment = await getPayment(entry.asaasPaymentId);
    await prisma.financeEntry.update({
      where: { id },
      data: { asaasStatus: payment.status, invoiceUrl: payment.invoiceUrl, bankSlipUrl: payment.bankSlipUrl ?? entry.bankSlipUrl },
    });
    if (PAID_STATUSES.includes(payment.status) && entry.status !== "pago") {
      await markEntryPaid(id, { paidAmountCents: Math.round(payment.value * 100), source: "Asaas" });
    }
    if (entry.invoice?.asaasInvoiceId) {
      await applyAsaasInvoice(entry.invoice.id, await getInvoice(entry.invoice.asaasInvoiceId));
    }
  } catch (e) {
    return { error: errorText(e) };
  }
  refresh();
  return { success: "Sincronizado com o Asaas." };
}

/* ---------- anexos ---------- */

export async function uploadEntryFile(entryId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("financeiro", 2);
  const file = await readUpload(formData);
  if ("error" in file) return { error: file.error };
  const label = String(formData.get("label") ?? "").trim().slice(0, 80) || null;
  const kind = /nota|nf/i.test(label ?? "") ? "nota" : /boleto/i.test(label ?? "") ? "boleto" : /comprovante/i.test(label ?? "") ? "comprovante" : "outro";
  await prisma.financeFile.create({ data: { entryId, kind, label, ...file } });
  await logActivity(user, "anexou", "financeiro", `Anexou "${label ?? file.name}" a um lançamento`, entryId);
  refresh();
  return { success: "Arquivo anexado." };
}

export async function deleteEntryFile(fileId: string) {
  await requireAccess("financeiro", 2);
  await prisma.financeFile.deleteMany({ where: { id: fileId } });
  refresh();
}

/* ---------- ações em lote (seleção nas tabelas) ---------- */

export type BulkAction = "baixa" | "reabrir" | "cancelar" | "excluir" | "cobrar" | "email" | "editar";
export type BulkInput = { paidAt?: string; method?: string; account?: string; dueDate?: string; category?: string };

export async function bulkEntries(action: BulkAction, ids: string[], input: BulkInput = {}): Promise<FormState> {
  const user = await requireAccess("financeiro", action === "excluir" ? 3 : 2);
  const valid = ids.filter((id) => z.uuid().safeParse(id).success).slice(0, 500);
  if (valid.length === 0) return { error: "Nenhum lançamento selecionado." };
  const entries = await prisma.financeEntry.findMany({
    where: { id: { in: valid } },
    select: { id: true, description: true, status: true, type: true, asaasPaymentId: true },
  });
  const method = paymentMethods.find((m) => m.value === input.method)?.value;
  const date = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  const account = input.account?.trim().slice(0, 80) || null;
  let done = 0;
  const failures: string[] = [];

  for (const entry of entries) {
    try {
      switch (action) {
        case "baixa":
          if (entry.status !== "pendente") continue;
          await markEntryPaid(entry.id, { paidAt: date(input.paidAt), method: method ?? null, account, source: "manual" });
          break;
        case "reabrir":
          if (entry.status !== "pago") continue;
          await prisma.financeEntry.update({ where: { id: entry.id }, data: { status: "pendente", paidAt: null, paidAmountCents: null } });
          break;
        case "cancelar":
          if (entry.status !== "pendente") continue;
          if (entry.asaasPaymentId) await deletePayment(entry.asaasPaymentId);
          await prisma.financeEntry.update({ where: { id: entry.id }, data: { status: "cancelado", asaasStatus: entry.asaasPaymentId ? "DELETED" : null } });
          break;
        case "excluir":
          if (entry.asaasPaymentId && entry.status === "pendente") throw new Error("tem cobrança ativa no Asaas (cancele antes)");
          await prisma.financeEntry.delete({ where: { id: entry.id } });
          break;
        case "cobrar":
          if (entry.type !== "receber" || entry.status !== "pendente" || entry.asaasPaymentId) continue;
          await createAsaasCharge(entry.id);
          break;
        case "email":
          if (entry.type !== "receber" || entry.status !== "pendente") continue;
          await emailCharge(entry.id);
          break;
        case "editar": {
          const data: Prisma.FinanceEntryUpdateInput = {};
          if (date(input.dueDate)) {
            if (entry.asaasPaymentId && entry.status === "pendente") throw new Error("tem cobrança no Asaas; o vencimento não pode mudar");
            data.dueDate = toDbDate(date(input.dueDate)!)!;
          }
          if (method) data.method = method;
          if (account) data.account = account;
          if (input.category?.trim()) data.category = input.category.trim().slice(0, 60);
          if (Object.keys(data).length === 0) return { error: "Preencha ao menos um campo para alterar." };
          await prisma.financeEntry.update({ where: { id: entry.id }, data });
          break;
        }
      }
      done++;
    } catch (e) {
      failures.push(`${entry.description}: ${errorText(e)}`);
    }
  }

  const verbs: Record<BulkAction, [string, string]> = {
    baixa: ["deu baixa", "baixado(s)"],
    reabrir: ["reabriu", "reaberto(s)"],
    cancelar: ["cancelou", "cancelado(s)"],
    excluir: ["excluiu", "excluído(s)"],
    cobrar: ["cobrou", "com boleto/Pix gerado"],
    email: ["enviou", "enviado(s) por e-mail"],
    editar: ["editou", "alterado(s)"],
  };
  if (done > 0) await logActivity(user, verbs[action][0], "financeiro", `Ação em lote: ${verbs[action][0]} em ${done} lançamento(s)`);
  refresh();
  const skipped = entries.length - done - failures.length;
  const parts = [`${done} lançamento(s) ${verbs[action][1]}.`];
  if (skipped > 0) parts.push(`${skipped} ignorado(s) por não se aplicar.`);
  if (failures.length > 0) return { error: [...parts, `Falharam: ${failures.slice(0, 3).join("; ")}${failures.length > 3 ? "…" : ""}`].join(" ") };
  return { success: parts.join(" ") };
}
