"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { labelOf, leadSources, leadStatuses, temperatures, values } from "@/lib/admin/options";
import { firstError, formObject, optionalText, optionalUuid, type FormState } from "@/lib/admin/form";

const leadSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do lead.").max(80),
  phone: optionalText(30),
  email: z
    .string()
    .trim()
    .refine((v) => !v || z.email().safeParse(v).success, "E-mail inválido.")
    .transform((v) => v || null),
  company: optionalText(80),
  service: optionalText(60),
  message: optionalText(2000),
  source: z.enum(values(leadSources)),
  // Ausente na ficha do lead: lá a temperatura muda pela troca rápida.
  temperature: z.enum(values(temperatures)).optional(),
  status: z.enum(values(leadStatuses)),
  campaignId: optionalUuid,
  ownerId: optionalText(60),
  notes: optionalText(4000),
});

export async function saveLead(id: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("leads", 2);
  const parsed = leadSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  // Valores ficam só no orçamento (documento vinculado ao lead).
  const data = parsed.data;
  if (id) {
    const before = await prisma.lead.findUnique({ where: { id }, select: { status: true } });
    await prisma.lead.update({ where: { id }, data });
    const statusChange =
      before && before.status !== data.status
        ? ` (status: ${labelOf(leadStatuses, before.status)} → ${labelOf(leadStatuses, data.status)})`
        : "";
    await logActivity(user, "editou", "lead", `Editou o lead ${data.name}${statusChange}`, id);
    revalidatePath("/admin", "layout");
    return { success: "Lead atualizado." };
  }
  const created = await prisma.lead.create({
    data: { ...data, ownerId: data.ownerId ?? user.id },
    select: { id: true },
  });
  await logActivity(user, "criou", "lead", `Cadastrou o lead ${data.name}`, created.id);
  revalidatePath("/admin", "layout");
  // replace: fechar a janela da ficha volta para a lista, não para o formulário de cadastro.
  redirect(`/admin/leads/${created.id}`, RedirectType.replace);
}

export async function setLeadTemperature(id: string, temperature: string) {
  const user = await requireAccess("leads", 2);
  const parsed = z.enum(values(temperatures)).safeParse(temperature);
  if (!parsed.success) return;
  const lead = await prisma.lead.update({ where: { id }, data: { temperature: parsed.data }, select: { name: true } });
  await logActivity(user, "editou", "lead", `Marcou ${lead.name} como ${labelOf(temperatures, parsed.data).toLowerCase()}`, id);
  revalidatePath("/admin", "layout");
}

/** Troca rápida de status pela lista de leads. */
export async function setLeadStatus(id: string, status: string) {
  const user = await requireAccess("leads", 2);
  const parsed = z.enum(values(leadStatuses)).safeParse(status);
  if (!parsed.success) return;
  const lead = await prisma.lead.update({ where: { id }, data: { status: parsed.data }, select: { name: true } });
  await logActivity(user, "moveu", "lead", `Moveu ${lead.name} para "${labelOf(leadStatuses, parsed.data)}"`, id);
  revalidatePath("/admin", "layout");
}

/** Repescagem: lead sem interesse volta para a fila de contato. */
export async function recoverLead(id: string) {
  const user = await requireAccess("leads", 2);
  const lead = await prisma.lead.update({
    where: { id },
    data: { status: "novo", temperature: "frio" },
    select: { name: true },
  });
  await logActivity(user, "repescou", "lead", `Repescou o lead ${lead.name} (voltou para Aguardando contato)`, id);
  revalidatePath("/admin", "layout");
}

export async function deleteLead(id: string) {
  const user = await requireAccess("leads", 3);
  const lead = await prisma.lead.findUnique({ where: { id }, select: { name: true } });
  await prisma.lead.deleteMany({ where: { id } });
  if (lead) await logActivity(user, "excluiu", "lead", `Excluiu o lead ${lead.name}`, id);
  revalidatePath("/admin", "layout");
  redirect("/admin/leads");
}

/** Lead virou negócio: cria o cliente, o projeto inicial e marca o lead como "projeto fechado". */
export async function convertLead(id: string) {
  const user = await requireAccess("leads", 2);
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) redirect("/admin/leads");
  const ownerId = lead.ownerId ?? user.id;

  const projectId = await prisma.$transaction(async (tx) => {
    const clientId =
      lead.clientId ??
      (
        await tx.client.create({
          data: {
            name: lead.name,
            company: lead.company,
            email: lead.email,
            phone: lead.phone,
            ownerId,
            notes: lead.message ? `Pedido original: ${lead.message}` : null,
          },
          select: { id: true },
        })
      ).id;
    const project = await tx.project.create({
      data: {
        name: `${lead.service ?? "Projeto"} — ${lead.company ?? lead.name}`,
        clientId,
        leadId: lead.id,
        ownerId,
        service: lead.service,
        description: lead.message,
        startDate: new Date(new Date().toISOString().slice(0, 10)),
      },
      select: { id: true },
    });
    // Os orçamentos do lead (com os valores) passam a ser do projeto e do cliente.
    await tx.quote.updateMany({ where: { leadId: lead.id, projectId: null }, data: { projectId: project.id, clientId } });
    await tx.projectNote.create({
      data: { projectId: project.id, kind: "sistema", author: user.name, text: `Projeto criado a partir do lead ${lead.name}.` },
    });
    await tx.lead.update({ where: { id }, data: { clientId, status: "fechado", temperature: "quente" } });
    return project.id;
  });

  await logActivity(user, "converteu", "lead", `Fechou negócio com ${lead.name}: cliente e projeto criados`, id);
  revalidatePath("/admin", "layout");
  redirect(`/admin/projetos?projeto=${projectId}`);
}
