"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma, toDbDate } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { readUpload } from "@/lib/files";
import { parseMoney } from "@/lib/admin/format";
import { firstError, formObject, optionalDate, optionalText, optionalUuid, type FormState } from "@/lib/admin/form";
import { money } from "@/lib/finance/contract";
import { applyAsaasInvoice } from "@/lib/finance/invoices";
import { cancelInvoice as cancelAsaasInvoice, getInvoice } from "@/lib/integrations/asaas";

const refresh = () => revalidatePath("/admin", "layout");
const errorText = (e: unknown) => (e instanceof Error ? e.message : "Erro inesperado.");

const invoiceSchema = z.object({
  number: optionalText(30),
  series: optionalText(10),
  status: z.enum(["emitida", "pendente"]),
  issueDate: optionalDate,
  amount: z
    .string()
    .transform(parseMoney)
    .refine((v) => v > 0, "Informe o valor da nota."),
  iss: z.string().transform((v) => (v.trim() ? parseMoney(v) : null)),
  description: z.string().trim().min(3, "Descreva o serviço da nota.").max(2000),
  verificationCode: optionalText(60),
  clientId: optionalUuid,
  entryId: optionalUuid,
  notes: optionalText(2000),
});

/** Anexa o PDF e o XML enviados no formulário (campos opcionais). */
async function attachFiles(invoiceId: string, formData: FormData) {
  for (const [field, label] of [
    ["pdf", "PDF da nota"],
    ["xml", "XML da nota"],
  ] as const) {
    const file = formData.get(field);
    if (!(file instanceof File) || file.size === 0) continue;
    const upload = await readUpload(formData, field);
    if ("error" in upload) return upload.error;
    await prisma.invoiceFile.create({ data: { invoiceId, label, ...upload } });
  }
  return null;
}

/** Nota emitida fora do Asaas (portal da prefeitura). Notas do Asaas e canceladas só aceitam observações. */
export async function saveInvoice(id: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  if (id) {
    const current = await prisma.invoice.findUnique({ where: { id }, select: { source: true, status: true } });
    if (!current) return { error: "Nota não encontrada." };
    if (current.source === "asaas" || current.status === "cancelada") {
      await prisma.invoice.update({ where: { id }, data: { notes: String(formData.get("notes") ?? "").trim().slice(0, 2000) || null } });
      refresh();
      return { success: "Observações salvas." };
    }
  }
  const parsed = invoiceSchema.safeParse({ iss: "", clientId: "", entryId: "", ...formObject(formData) });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { amount, iss, issueDate, ...data } = parsed.data;
  if (data.status === "emitida" && (!data.number || !issueDate)) return { error: "Nota emitida precisa do número e da data de emissão." };
  if (data.entryId) {
    const taken = await prisma.invoice.findFirst({ where: { entryId: data.entryId, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
    if (taken) return { error: "Este lançamento já tem uma nota fiscal vinculada." };
  }
  const values = { ...data, amountCents: amount, issCents: iss, issueDate: toDbDate(issueDate) };

  if (id) {
    await prisma.invoice.update({ where: { id }, data: values });
    const fileError = await attachFiles(id, formData);
    await logActivity(user, "editou", "notafiscal", `Editou a nota fiscal ${data.number ?? ""} — ${data.description}`.replace("  ", " "), id);
    refresh();
    return fileError ? { error: `Nota salva, mas o arquivo não foi anexado: ${fileError}` } : { success: "Nota salva." };
  }

  const created = await prisma.invoice.create({ data: { ...values, source: "manual" }, select: { id: true } });
  const fileError = await attachFiles(created.id, formData);
  await logActivity(user, "criou", "notafiscal", `Registrou a nota fiscal ${data.number ?? "(sem número)"} de ${money(amount)}`, created.id);
  refresh();
  redirect(`/admin/notas-fiscais/${created.id}${fileError ? "?erro=arquivo" : ""}`);
}

/** Cancela a nota. No Asaas, pede o cancelamento à prefeitura e a confirmação chega pelo webhook. */
export async function cancelInvoice(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 500);
  if (reason.length < 5) return { error: "Informe o motivo do cancelamento." };
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) return { error: "Nota não encontrada." };
  if (invoice.status === "cancelada") return { error: "Esta nota já está cancelada." };

  if (invoice.source === "asaas" && invoice.asaasInvoiceId) {
    try {
      const nf = await cancelAsaasInvoice(invoice.asaasInvoiceId);
      await prisma.invoice.update({ where: { id }, data: { cancelReason: reason } });
      await applyAsaasInvoice(id, nf);
    } catch (e) {
      return { error: `O Asaas recusou o cancelamento: ${errorText(e)}` };
    }
    await logActivity(user, "cancelou", "notafiscal", `Pediu o cancelamento da nota ${invoice.number ?? ""} no Asaas: ${reason}`, id);
    refresh();
    return { success: "Cancelamento solicitado. A prefeitura confirma em alguns minutos." };
  }

  await prisma.invoice.update({ where: { id }, data: { status: "cancelada", cancelledAt: new Date(), cancelReason: reason } });
  await logActivity(user, "cancelou", "notafiscal", `Registrou o cancelamento da nota ${invoice.number ?? ""}: ${reason}`, id);
  refresh();
  return { success: "Nota marcada como cancelada. Lembre-se de cancelar também no portal da prefeitura." };
}

export async function syncInvoice(id: string, _: FormState): Promise<FormState> {
  await requireUser();
  const invoice = await prisma.invoice.findUnique({ where: { id }, select: { asaasInvoiceId: true } });
  if (!invoice?.asaasInvoiceId) return { error: "Esta nota não foi emitida pelo Asaas." };
  try {
    await applyAsaasInvoice(id, await getInvoice(invoice.asaasInvoiceId));
  } catch (e) {
    return { error: errorText(e) };
  }
  refresh();
  return { success: "Sincronizado com o Asaas." };
}

export async function deleteInvoice(id: string) {
  const user = await requireUser();
  const invoice = await prisma.invoice.findUnique({ where: { id }, select: { source: true, number: true, description: true } });
  if (!invoice) redirect("/admin/notas-fiscais");
  if (invoice.source === "asaas") redirect(`/admin/notas-fiscais/${id}`);
  await prisma.invoice.delete({ where: { id } });
  await logActivity(user, "excluiu", "notafiscal", `Excluiu o registro da nota ${invoice.number ?? invoice.description}`, id);
  refresh();
  redirect("/admin/notas-fiscais");
}

export async function uploadInvoiceFile(invoiceId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const file = await readUpload(formData);
  if ("error" in file) return { error: file.error };
  const label = String(formData.get("label") ?? "").trim().slice(0, 80) || null;
  await prisma.invoiceFile.create({ data: { invoiceId, label, ...file } });
  await logActivity(user, "anexou", "notafiscal", `Anexou "${label ?? file.name}" a uma nota fiscal`, invoiceId);
  refresh();
  return { success: "Arquivo anexado." };
}

export async function deleteInvoiceFile(fileId: string) {
  await requireUser();
  await prisma.invoiceFile.deleteMany({ where: { id: fileId } });
  refresh();
}
