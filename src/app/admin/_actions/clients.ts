"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { readUpload } from "@/lib/files";
import { firstError, formObject, optionalText, type FormState } from "@/lib/admin/form";

const clientSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do responsável.").max(80),
  company: optionalText(120),
  email: z
    .string()
    .trim()
    .refine((v) => !v || z.email().safeParse(v).success, "E-mail inválido.")
    .transform((v) => v || null),
  phone: optionalText(30),
  document: z
    .string()
    .trim()
    .refine((v) => !v || [11, 14].includes(v.replace(/\D/g, "").length), "CPF deve ter 11 dígitos e CNPJ, 14.")
    .transform((v) => v || null),
  stateRegistration: optionalText(30),
  address: optionalText(200),
  zipCode: optionalText(12),
  city: optionalText(80),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine((v) => !v || /^[A-Z]{2}$/.test(v), "UF inválida.")
    .transform((v) => v || null),
  ownerId: optionalText(60),
  notes: optionalText(4000),
});

export async function saveClient(id: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("clientes", 2);
  const parsed = clientSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const label = parsed.data.company ?? parsed.data.name;
  if (id) {
    await prisma.client.update({ where: { id }, data: parsed.data });
    await logActivity(user, "editou", "cliente", `Editou o cadastro de ${label}`, id);
    revalidatePath("/admin", "layout");
    return { success: "Cliente atualizado." };
  }
  const created = await prisma.client.create({
    data: { ...parsed.data, ownerId: parsed.data.ownerId ?? user.id },
    select: { id: true },
  });
  await logActivity(user, "criou", "cliente", `Cadastrou o cliente ${label}`, created.id);
  revalidatePath("/admin", "layout");
  redirect(`/admin/clientes/${created.id}`);
}

export async function deleteClient(id: string) {
  const user = await requireAccess("clientes", 3);
  const client = await prisma.client.findUnique({ where: { id }, select: { name: true, company: true } });
  await prisma.client.deleteMany({ where: { id } });
  if (client) await logActivity(user, "excluiu", "cliente", `Excluiu o cliente ${client.company ?? client.name}`, id);
  revalidatePath("/admin", "layout");
  redirect("/admin/clientes");
}

/** Anexa um documento ao cadastro do cliente (inscrição estadual, contrato social...). */
export async function uploadClientFile(clientId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("clientes", 2);
  const file = await readUpload(formData);
  if ("error" in file) return { error: file.error };
  const label = String(formData.get("label") ?? "").trim().slice(0, 80) || null;
  const client = await prisma.client.findUnique({ where: { id: clientId }, select: { name: true, company: true } });
  if (!client) return { error: "Cliente não encontrado." };
  await prisma.clientFile.create({ data: { clientId, label, ...file } });
  await logActivity(user, "anexou", "cliente", `Anexou "${label ?? file.name}" ao cliente ${client.company ?? client.name}`, clientId);
  revalidatePath(`/admin/clientes/${clientId}`);
  return { success: "Arquivo anexado." };
}

export async function deleteClientFile(fileId: string) {
  const user = await requireAccess("clientes", 2);
  const file = await prisma.clientFile.findUnique({
    where: { id: fileId },
    select: { clientId: true, name: true, label: true },
  });
  if (!file) return;
  await prisma.clientFile.delete({ where: { id: fileId } });
  await logActivity(user, "excluiu", "cliente", `Removeu o anexo "${file.label ?? file.name}"`, file.clientId);
  revalidatePath(`/admin/clientes/${file.clientId}`);
}
