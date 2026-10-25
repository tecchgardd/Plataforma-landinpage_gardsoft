"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { firstError, formObject, optionalText, optionalUuid, type FormState } from "@/lib/admin/form";
import { money, newToken, nextContractNumber, paymentPlanSchema, signUrl } from "@/lib/finance/contract";
import { contractPdf } from "@/lib/finance/contract-pdf";
import { createAsaasCharge, createEntriesFromContract, emailCharge } from "@/lib/finance/billing";
import { asaasConfigured } from "@/lib/integrations/asaas";
import { emailConfigured, emailLayout, sendEmail } from "@/lib/integrations/email";

const contractSchema = z.object({
  title: z.string().trim().min(3, "Informe o título do contrato.").max(140),
  clientId: z.uuid("Escolha o cliente."),
  projectId: optionalUuid,
  preamble: optionalText(4000),
  scope: z.string().trim().min(10, "Descreva o escopo do projeto.").max(20000),
  clauses: z.string().trim().min(10, "As cláusulas não podem ficar vazias.").max(30000),
  deliveryDays: z
    .string()
    .trim()
    .transform((v) => (v ? Number(v) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v < 1000), "Prazo inválido."),
});

const refresh = () => revalidatePath("/admin", "layout");

export async function saveContract(id: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("contratos", 2);
  const parsed = contractSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  let rawPlan: unknown;
  try {
    rawPlan = JSON.parse(String(formData.get("paymentPlan") ?? "[]"));
  } catch {
    return { error: "Plano de pagamento inválido." };
  }
  const plan = paymentPlanSchema.safeParse(rawPlan);
  if (!plan.success) return { error: "Confira o plano de pagamento: cada parcela precisa de descrição, valor e vencimento." };
  const valueCents = plan.data.reduce((s, p) => s + p.amountCents, 0);
  const data = { ...parsed.data, paymentPlan: plan.data, valueCents };

  if (id) {
    const current = await prisma.contract.findUnique({ where: { id }, select: { status: true, number: true } });
    if (!current) return { error: "Contrato não encontrado." };
    if (current.status === "assinado") return { error: "Contrato assinado não pode ser alterado." };
    // Alterar um contrato já enviado exige reenviar: volta para rascunho.
    const reset = current.status === "enviado" || current.status === "visualizado";
    await prisma.contract.update({
      where: { id },
      data: { ...data, ...(reset ? { status: "rascunho", sentAt: null, viewedAt: null, token: newToken() } : {}) },
    });
    await logActivity(user, "editou", "contrato", `Editou o contrato ${current.number}${reset ? " (precisa ser reenviado)" : ""}`, id);
    refresh();
    return { success: reset ? "Contrato alterado. O link anterior foi invalidado: envie novamente." : "Contrato salvo." };
  }

  const number = await nextContractNumber();
  const created = await prisma.contract.create({
    data: { ...data, number, token: newToken(), createdById: user.id },
    select: { id: true },
  });
  await logActivity(user, "criou", "contrato", `Criou o contrato ${number} — ${data.title}`, created.id);
  refresh();
  redirect(`/admin/contratos/${created.id}`);
}

/** Envia para assinatura: e-mail com o link e a minuta em PDF. Sem e-mail configurado, o link fica pronto para copiar. */
export async function sendContract(id: string, _: FormState): Promise<FormState> {
  const user = await requireAccess("contratos", 2);
  const contract = await prisma.contract.findUnique({ where: { id }, include: { client: true } });
  if (!contract) return { error: "Contrato não encontrado." };
  if (contract.status === "assinado" || contract.status === "cancelado") return { error: "Este contrato não pode mais ser enviado." };
  if (!contract.client.document) return { error: "Cadastre o CPF/CNPJ do cliente antes de enviar o contrato." };

  await prisma.contract.update({ where: { id }, data: { status: contract.status === "visualizado" ? "visualizado" : "enviado", sentAt: new Date() } });
  const link = signUrl(contract.token);

  if (!emailConfigured() || !contract.client.email) {
    await logActivity(user, "enviou", "contrato", `Gerou o link de assinatura do contrato ${contract.number}`, id);
    refresh();
    return {
      success: !contract.client.email
        ? "Link gerado. O cliente não tem e-mail cadastrado: copie o link e envie pelo WhatsApp."
        : "Link gerado. O e-mail ainda não está configurado: copie o link e envie ao cliente.",
    };
  }

  try {
    const pdf = await contractPdf({ id });
    await sendEmail({
      to: contract.client.email,
      replyTo: user.email,
      subject: `Contrato ${contract.number} para assinatura — Gardsoft`,
      html: emailLayout({
        title: "Seu contrato está pronto para assinatura",
        paragraphs: [
          `Olá, ${contract.client.name.split(" ")[0]}!`,
          `Enviamos o contrato ${contract.number} — ${contract.title}, no valor total de ${money(contract.valueCents)}.`,
          "Clique no botão para ler e assinar eletronicamente. A minuta também segue em anexo.",
        ],
        button: { label: "Ler e assinar o contrato", url: link },
      }),
      attachments: pdf ? [{ filename: pdf.filename, content: pdf.buffer }] : [],
    });
  } catch (error) {
    return { error: `Link gerado, mas o e-mail falhou: ${error instanceof Error ? error.message : "erro desconhecido"}. Copie o link abaixo.` };
  }
  await logActivity(user, "enviou", "contrato", `Enviou o contrato ${contract.number} para ${contract.client.email}`, id);
  refresh();
  return { success: `Contrato enviado para ${contract.client.email}.` };
}

export async function cancelContract(id: string) {
  const user = await requireAccess("contratos", 2);
  const contract = await prisma.contract.update({ where: { id }, data: { status: "cancelado" }, select: { number: true } });
  await logActivity(user, "cancelou", "contrato", `Cancelou o contrato ${contract.number}`, id);
  refresh();
}

export async function deleteContract(id: string) {
  const user = await requireAccess("contratos", 3);
  const contract = await prisma.contract.findUnique({ where: { id }, select: { number: true, status: true } });
  if (!contract) redirect("/admin/contratos");
  if (contract.status === "assinado") redirect(`/admin/contratos/${id}`);
  await prisma.contract.delete({ where: { id } });
  await logActivity(user, "excluiu", "contrato", `Excluiu o contrato ${contract.number}`, id);
  refresh();
  redirect("/admin/contratos");
}

/** Cria as contas a receber do contrato e, com o Asaas configurado, gera e envia as cobranças. */
export async function generateCharges(id: string, _: FormState): Promise<FormState> {
  const user = await requireAccess("financeiro", 2);
  const contract = await prisma.contract.findUnique({ where: { id }, select: { number: true, status: true } });
  if (!contract) return { error: "Contrato não encontrado." };
  if (contract.status !== "assinado") return { error: "Gere as cobranças depois que o contrato for assinado." };
  const created = await createEntriesFromContract(id);
  let charged = 0;
  const errors: string[] = [];
  if (asaasConfigured()) {
    const entries = await prisma.financeEntry.findMany({ where: { contractId: id, status: "pendente", asaasPaymentId: null } });
    for (const e of entries) {
      try {
        await createAsaasCharge(e.id);
        if (emailConfigured()) await emailCharge(e.id);
        charged++;
      } catch (err) {
        errors.push(err instanceof Error ? err.message : "erro");
      }
    }
  }
  await logActivity(user, "criou", "financeiro", `Gerou ${created.length} parcela(s) do contrato ${contract.number}`, id);
  refresh();
  if (errors.length) return { error: `Parcelas criadas, mas houve erro no Asaas: ${errors[0]}` };
  return {
    success: asaasConfigured()
      ? `${created.length} parcela(s) criada(s) e ${charged} cobrança(s) gerada(s) no Asaas.`
      : `${created.length} parcela(s) criada(s) em Contas a receber.`,
  };
}
