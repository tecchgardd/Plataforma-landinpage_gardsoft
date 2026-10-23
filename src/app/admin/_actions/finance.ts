"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma, toDbDate } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { readUpload } from "@/lib/files";
import { parseMoney } from "@/lib/admin/format";
import { paymentMethods } from "@/lib/admin/options";
import { firstError, formObject, optionalText, optionalUuid, type FormState } from "@/lib/admin/form";
import { createAsaasCharge, emailCharge, issueEntryInvoice, markEntryPaid } from "@/lib/finance/billing";
import { money } from "@/lib/finance/contract";
import { financeSettingsSchema, saveFinanceSettings } from "@/lib/finance/settings";
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
  notes: optionalText(4000),
  repeat: z
    .string()
    .optional()
    .transform((v) => Math.min(60, Math.max(1, Number(v) || 1))),
  repeatMode: z.enum(["parcelas", "mensal"]).optional(),
});

function addMonths(iso: string, months: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(d, last));
  return date.toISOString().slice(0, 10);
}

export async function saveEntry(id: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  // Receitas não têm "fornecedor" e despesas não têm "cliente" no formulário.
  const parsed = entrySchema.safeParse({ clientId: "", supplier: "", projectId: "", method: "", notes: "", ...formObject(formData) });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { amount, dueDate, repeat, repeatMode, ...data } = parsed.data;
  const label = data.type === "receber" ? "conta a receber" : "conta a pagar";

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
  refresh();
  redirect(count > 1 ? `/admin/financeiro/${data.type}` : `/admin/financeiro/lancamento/${ids[0]}`);
}

/** Baixa manual com comprovante opcional. */
export async function payEntry(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const form = formObject(formData);
  const paidAt = /^\d{4}-\d{2}-\d{2}$/.test(form.paidAt ?? "") ? form.paidAt : undefined;
  const paidAmountCents = form.paidAmount ? parseMoney(form.paidAmount) : undefined;
  const method = paymentMethods.find((m) => m.value === form.method)?.value ?? null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const upload = await readUpload(formData);
    if ("error" in upload) return { error: upload.error };
    await prisma.financeFile.create({ data: { entryId: id, kind: "comprovante", label: "Comprovante de pagamento", ...upload } });
  }
  try {
    const entry = await markEntryPaid(id, { paidAt, paidAmountCents, method, source: "manual" });
    await logActivity(user, "deu baixa", "financeiro", `Deu baixa em ${entry.description} (${money(entry.paidAmountCents ?? entry.amountCents)})`, id);
  } catch (e) {
    return { error: errorText(e) };
  }
  refresh();
  return { success: "Pagamento registrado." };
}

export async function reopenEntry(id: string) {
  const user = await requireUser();
  const entry = await prisma.financeEntry.update({
    where: { id },
    data: { status: "pendente", paidAt: null, paidAmountCents: null },
    select: { description: true },
  });
  await logActivity(user, "reabriu", "financeiro", `Desfez a baixa de ${entry.description}`, id);
  refresh();
}

export async function cancelEntry(id: string, _: FormState): Promise<FormState> {
  const user = await requireUser();
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
  const user = await requireUser();
  const entry = await prisma.financeEntry.findUnique({ where: { id }, select: { description: true, type: true, asaasPaymentId: true, status: true } });
  if (!entry) redirect("/admin/financeiro");
  if (entry.asaasPaymentId && entry.status === "pendente") redirect(`/admin/financeiro/lancamento/${id}?erro=asaas`);
  await prisma.financeEntry.delete({ where: { id } });
  await logActivity(user, "excluiu", "financeiro", `Excluiu o lançamento ${entry.description}`, id);
  refresh();
  redirect(`/admin/financeiro/${entry.type}`);
}

/* ---------- Asaas ---------- */

export async function chargeEntry(id: string, _: FormState): Promise<FormState> {
  const user = await requireUser();
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
  const user = await requireUser();
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
  const user = await requireUser();
  try {
    const entry = await issueEntryInvoice(id);
    await logActivity(user, "emitiu", "financeiro", `Solicitou a nota fiscal de ${entry.description}`, id);
  } catch (e) {
    return { error: errorText(e) };
  }
  refresh();
  return { success: "Nota fiscal solicitada. Ela fica disponível quando a prefeitura autorizar." };
}

/** Atualiza status da cobrança e da nota direto do Asaas (caso algum aviso não tenha chegado). */
export async function syncEntry(id: string, _: FormState): Promise<FormState> {
  await requireUser();
  const entry = await prisma.financeEntry.findUnique({ where: { id } });
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
    if (entry.asaasInvoiceId) {
      const nf = await getInvoice(entry.asaasInvoiceId);
      await prisma.financeEntry.update({
        where: { id },
        data: { nfStatus: nf.status, nfNumber: nf.number ?? null, nfPdfUrl: nf.pdfUrl ?? null, nfXmlUrl: nf.xmlUrl ?? null },
      });
    }
  } catch (e) {
    return { error: errorText(e) };
  }
  refresh();
  return { success: "Sincronizado com o Asaas." };
}

/* ---------- anexos ---------- */

export async function uploadEntryFile(entryId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
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
  await requireUser();
  await prisma.financeFile.deleteMany({ where: { id: fileId } });
  refresh();
}

/* ---------- configurações ---------- */

export async function saveSettings(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const f = formObject(formData);
  const num = (v: string | undefined) => Number((v ?? "0").replace(",", ".")) || 0;
  const parsed = financeSettingsSchema.safeParse({
    company: {
      legalName: f.legalName ?? "",
      tradeName: f.tradeName ?? "",
      document: f.document ?? "",
      address: f.address ?? "",
      cityState: f.cityState ?? "",
      email: f.email ?? "",
      phone: f.phone ?? "",
      website: f.website ?? "",
      representative: f.representative ?? "",
    },
    contract: { clauses: f.clauses ?? "", jurisdiction: f.jurisdiction ?? "" },
    billing: {
      method: f.billingMethod,
      finePercent: num(f.finePercent),
      interestPercent: num(f.interestPercent),
      createOnSign: f.createOnSign === "on",
    },
    invoice: {
      autoIssue: f.autoIssue === "on",
      municipalServiceCode: f.municipalServiceCode ?? "",
      municipalServiceName: f.municipalServiceName ?? "",
      description: f.invoiceDescription ?? "",
      issPercent: num(f.issPercent),
      retainIss: f.retainIss === "on",
    },
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  await saveFinanceSettings(parsed.data);
  await logActivity(user, "editou", "financeiro", "Atualizou as configurações financeiras", null);
  refresh();
  return { success: "Configurações salvas." };
}

