"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma, toDbDate } from "@/lib/prisma";
import { requireAccess } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { parseMoney } from "@/lib/admin/format";
import { firstError, formObject, optionalDate, optionalText, optionalUuid, type FormState } from "@/lib/admin/form";
import { money, newToken, nextContractNumber } from "@/lib/finance/contract";
import { loadQuote, nextQuoteNumber, quoteItemsSchema, quoteSubtotal, quoteUrl, recipientOf } from "@/lib/finance/quote";
import { quotePdf } from "@/lib/finance/quote-pdf";
import { getFinanceSettings } from "@/lib/finance/settings";
import { emailConfigured, emailLayout, sendEmail } from "@/lib/integrations/email";

const quoteSchema = z
  .object({
    title: z.string().trim().min(3, "Informe o título do orçamento.").max(140),
    clientId: optionalUuid,
    leadId: optionalUuid,
    projectId: optionalUuid,
    intro: optionalText(2000),
    validUntil: optionalDate,
    deliveryDays: z
      .string()
      .trim()
      .transform((v) => (v ? Number(v) : null))
      .refine((v) => v === null || (Number.isInteger(v) && v > 0 && v < 1000), "Prazo inválido."),
    paymentTerms: optionalText(1000),
    notes: optionalText(2000),
    discount: z.string().transform(parseMoney),
  })
  .refine((d) => d.clientId || d.leadId, { message: "Escolha o cliente ou o lead que vai receber o orçamento." });

const refresh = () => revalidatePath("/admin", "layout");
const todayIso = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const addDays = (iso: string, days: number) => new Date(new Date(`${iso}T12:00:00Z`).getTime() + days * 864e5).toISOString().slice(0, 10);

export async function saveQuote(id: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("orcamentos", 2);
  const parsed = quoteSchema.safeParse({ clientId: "", leadId: "", projectId: "", discount: "", ...formObject(formData) });
  if (!parsed.success) return { error: firstError(parsed.error) };
  let rawItems: unknown;
  try {
    rawItems = JSON.parse(String(formData.get("items") ?? "[]"));
  } catch {
    return { error: "Itens inválidos." };
  }
  const items = quoteItemsSchema.safeParse(rawItems);
  if (!items.success) return { error: "Confira os itens: cada um precisa de descrição, quantidade e valor." };
  const { discount, validUntil, ...fields } = parsed.data;
  const subtotal = quoteSubtotal(items.data);
  if (discount > subtotal) return { error: "O desconto não pode ser maior que o subtotal." };
  const data = { ...fields, items: items.data, discountCents: discount, totalCents: subtotal - discount, validUntil: toDbDate(validUntil) };

  if (id) {
    const current = await prisma.quote.findUnique({ where: { id }, select: { status: true, number: true, contractId: true } });
    if (!current) return { error: "Orçamento não encontrado." };
    if (current.contractId) return { error: "Este orçamento já virou contrato e não pode ser alterado." };
    // Alterar um orçamento já enviado ou decidido exige reenviar: volta para rascunho com um novo link.
    const reset = current.status !== "rascunho";
    await prisma.quote.update({
      where: { id },
      data: {
        ...data,
        ...(reset
          ? { status: "rascunho", token: newToken(), sentAt: null, viewedAt: null, decidedAt: null, decisionName: null, decisionNote: null, decisionIp: null }
          : {}),
      },
    });
    await logActivity(user, "editou", "orcamento", `Editou o orçamento ${current.number}${reset ? " (precisa ser reenviado)" : ""}`, id);
    refresh();
    return { success: reset ? "Orçamento alterado. O link anterior foi invalidado: envie novamente." : "Orçamento salvo." };
  }

  const number = await nextQuoteNumber();
  const created = await prisma.quote.create({
    data: { ...data, number, token: newToken(), createdById: user.id },
    select: { id: true },
  });
  await logActivity(user, "criou", "orcamento", `Criou o orçamento ${number} — ${data.title} (${money(data.totalCents)})`, created.id);
  refresh();
  redirect(`/admin/orcamentos/${created.id}`);
}

/** Envia o link de aprovação por e-mail com o PDF. Sem e-mail configurado, o link fica pronto para copiar. */
export async function sendQuote(id: string, _: FormState): Promise<FormState> {
  const user = await requireAccess("orcamentos", 2);
  const loaded = await loadQuote({ id });
  if (!loaded) return { error: "Orçamento não encontrado." };
  const { quote } = loaded;
  if (quote.status === "cancelado" || quote.contractId) return { error: "Este orçamento não pode mais ser enviado." };
  if (quote.status === "aprovado" || quote.status === "recusado") return { error: "Este orçamento já foi respondido. Edite-o para enviar uma nova versão." };

  await prisma.quote.update({ where: { id }, data: { status: quote.status === "visualizado" ? "visualizado" : "enviado", sentAt: new Date() } });
  const to = recipientOf(quote);
  const link = quoteUrl(quote.token);

  if (!emailConfigured() || !to.email) {
    await logActivity(user, "enviou", "orcamento", `Gerou o link do orçamento ${quote.number}`, id);
    refresh();
    return {
      success: !to.email
        ? "Link gerado. O destinatário não tem e-mail cadastrado: copie o link e envie pelo WhatsApp."
        : "Link gerado. O e-mail ainda não está configurado: copie o link e envie ao cliente.",
    };
  }

  try {
    const pdf = await quotePdf({ id });
    await sendEmail({
      to: to.email,
      replyTo: user.email,
      subject: `Orçamento ${quote.number} — ${quote.title}`,
      html: emailLayout({
        title: "Seu orçamento está pronto",
        paragraphs: [
          `Olá, ${to.name.split(" ")[0]}!`,
          `Enviamos o orçamento ${quote.number} — ${quote.title}, no valor total de ${money(quote.totalCents)}.`,
          "No botão abaixo você vê os detalhes e pode aprovar ou recusar. O PDF também segue em anexo.",
        ],
        button: { label: "Ver e aprovar o orçamento", url: link },
      }),
      attachments: pdf ? [{ filename: pdf.filename, content: pdf.buffer }] : [],
    });
  } catch (error) {
    return { error: `Link gerado, mas o e-mail falhou: ${error instanceof Error ? error.message : "erro desconhecido"}. Copie o link abaixo.` };
  }
  await logActivity(user, "enviou", "orcamento", `Enviou o orçamento ${quote.number} para ${to.email}`, id);
  refresh();
  return { success: `Orçamento enviado para ${to.email}.` };
}

/** Registra a resposta dada fora do link (WhatsApp, telefone, reunião). */
export async function decideQuoteManually(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("orcamentos", 2);
  const f = formObject(formData);
  const decision = f.decision === "aprovado" || f.decision === "recusado" ? f.decision : null;
  if (!decision) return { error: "Escolha aprovado ou recusado." };
  const quote = await prisma.quote.findUnique({ where: { id }, select: { number: true, status: true, contractId: true } });
  if (!quote) return { error: "Orçamento não encontrado." };
  if (quote.status === "cancelado" || quote.contractId) return { error: "Este orçamento não pode mais ser alterado." };
  await prisma.quote.update({
    where: { id },
    data: {
      status: decision,
      decidedAt: new Date(),
      decisionName: `${user.name} (registrado no portal)`,
      decisionNote: (f.note ?? "").slice(0, 1000) || null,
      decisionIp: null,
    },
  });
  await logActivity(user, decision === "aprovado" ? "aprovou" : "recusou", "orcamento", `Registrou o orçamento ${quote.number} como ${decision}`, id);
  refresh();
  return { success: decision === "aprovado" ? "Orçamento marcado como aprovado." : "Orçamento marcado como recusado." };
}

/** Orçamento aprovado vira contrato em rascunho (com o cliente criado a partir do lead, se preciso). */
export async function convertQuoteToContract(id: string) {
  const user = await requireAccess("contratos", 2);
  const loaded = await loadQuote({ id });
  if (!loaded) redirect("/admin/orcamentos");
  const { quote, items } = loaded;
  if (quote.contract) redirect(`/admin/contratos/${quote.contract.id}`);
  if (quote.status !== "aprovado") redirect(`/admin/orcamentos/${id}?erro=aprovacao`);
  const settings = await getFinanceSettings();

  const scope = [
    ...items.map((i) => `- ${i.description}${i.quantity !== 1 ? ` (${String(i.quantity).replace(".", ",")}x)` : ""}${i.details ? `\n  ${i.details.replace(/\n+/g, "\n  ")}` : ""}`),
    quote.notes ? `\nObservações: ${quote.notes}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const first = addDays(todayIso(), 3);
  const half = Math.round(quote.totalCents / 2);
  const paymentPlan = [
    { label: "Entrada (50%)", amountCents: half, dueDate: first },
    { label: "Entrega (50%)", amountCents: quote.totalCents - half, dueDate: addDays(first, quote.deliveryDays ?? 30) },
  ].filter((p) => p.amountCents > 0);
  const number = await nextContractNumber();

  const contractId = await prisma.$transaction(async (tx) => {
    let clientId = quote.clientId;
    if (!clientId && quote.lead) {
      const lead = await tx.lead.findUniqueOrThrow({ where: { id: quote.lead.id } });
      clientId =
        lead.clientId ??
        (
          await tx.client.create({
            data: { name: lead.name, company: lead.company, email: lead.email, phone: lead.phone, ownerId: lead.ownerId ?? user.id },
            select: { id: true },
          })
        ).id;
      await tx.lead.update({ where: { id: lead.id }, data: { clientId, status: "fechado", temperature: "quente" } });
    }
    if (!clientId) throw new Error("Orçamento sem cliente.");
    const contract = await tx.contract.create({
      data: {
        number,
        title: quote.title,
        clientId,
        projectId: quote.projectId,
        preamble: settings.contract.preamble,
        scope: scope || quote.title,
        clauses: settings.contract.clauses,
        valueCents: quote.totalCents,
        paymentPlan: paymentPlan.length ? paymentPlan : [{ label: "Pagamento à vista", amountCents: quote.totalCents, dueDate: first }],
        deliveryDays: quote.deliveryDays ?? (settings.contract.deliveryDays || null),
        token: newToken(),
        createdById: user.id,
      },
      select: { id: true },
    });
    await tx.quote.update({ where: { id }, data: { contractId: contract.id, clientId } });
    return contract.id;
  });

  await logActivity(user, "converteu", "orcamento", `Gerou o contrato ${number} a partir do orçamento ${quote.number}`, id);
  await logActivity(user, "criou", "contrato", `Criou o contrato ${number} a partir do orçamento ${quote.number}`, contractId);
  refresh();
  redirect(`/admin/contratos/${contractId}`);
}

/** Nova versão a partir de um orçamento existente (ex.: depois de uma recusa). */
export async function duplicateQuote(id: string) {
  const user = await requireAccess("orcamentos", 2);
  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) redirect("/admin/orcamentos");
  const number = await nextQuoteNumber();
  const settings = await getFinanceSettings();
  const created = await prisma.quote.create({
    data: {
      number,
      title: quote.title,
      clientId: quote.clientId,
      leadId: quote.leadId,
      projectId: quote.projectId,
      intro: quote.intro,
      items: quote.items ?? [],
      discountCents: quote.discountCents,
      totalCents: quote.totalCents,
      validUntil: toDbDate(addDays(todayIso(), settings.quote.validityDays)),
      deliveryDays: quote.deliveryDays,
      paymentTerms: quote.paymentTerms,
      notes: quote.notes,
      token: newToken(),
      createdById: user.id,
    },
    select: { id: true },
  });
  await logActivity(user, "criou", "orcamento", `Criou o orçamento ${number} a partir do ${quote.number}`, created.id);
  refresh();
  redirect(`/admin/orcamentos/${created.id}`);
}

export async function cancelQuote(id: string) {
  const user = await requireAccess("orcamentos", 2);
  const quote = await prisma.quote.update({ where: { id }, data: { status: "cancelado" }, select: { number: true } });
  await logActivity(user, "cancelou", "orcamento", `Cancelou o orçamento ${quote.number}`, id);
  refresh();
}

export async function deleteQuote(id: string) {
  const user = await requireAccess("orcamentos", 3);
  const quote = await prisma.quote.findUnique({ where: { id }, select: { number: true, contractId: true } });
  if (!quote) redirect("/admin/orcamentos");
  if (quote.contractId) redirect(`/admin/orcamentos/${id}`);
  await prisma.quote.delete({ where: { id } });
  await logActivity(user, "excluiu", "orcamento", `Excluiu o orçamento ${quote.number}`, id);
  refresh();
  redirect("/admin/orcamentos");
}
