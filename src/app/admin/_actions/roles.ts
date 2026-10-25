"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAccess, requireAccess } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { slugify } from "@/lib/admin/format";
import { firstError, formObject, optionalText, type FormState } from "@/lib/admin/form";
import { modules, SUPER_ADMIN, type Level, type Permissions } from "@/lib/permissions";

const refresh = () => revalidatePath("/admin", "layout");

const roleSchema = z.object({
  name: z.string().trim().min(2, "Dê um nome ao perfil.").max(60),
  description: optionalText(300),
});

/** Lê a matriz do formulário (campos perm_<módulo> com 0–3). */
function readPermissions(formData: FormData): Permissions {
  const out: Permissions = {};
  for (const m of modules) {
    const value = Number(formData.get(`perm_${m.key}`));
    out[m.key] = ([0, 1, 2, 3].includes(value) ? value : 0) as Level;
  }
  return out;
}

export async function saveRole(id: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("perfis", 2);
  const access = (await getAccess())!;
  const parsed = roleSchema.safeParse({ description: "", ...formObject(formData) });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const permissions = readPermissions(formData);

  if (!id) {
    const base = slugify(parsed.data.name).replace(/-/g, "_") || "perfil";
    let key = base;
    for (let i = 2; await prisma.role.findUnique({ where: { key }, select: { id: true } }); i++) key = `${base}_${i}`;
    if (key === SUPER_ADMIN) key = `${base}_custom`;
    const role = await prisma.role.create({ data: { ...parsed.data, key, permissions }, select: { id: true } });
    await logActivity(user, "criou", "acesso", `Criou o perfil de acesso ${parsed.data.name}`, role.id);
    refresh();
    redirect(`/admin/perfis/${role.id}?criado=1`);
  }

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) return { error: "Perfil não encontrado." };
  // Evita que alguém aumente o próprio acesso editando o perfil que usa.
  if (!access.isSuperAdmin && access.role?.id === role.id) return { error: "Você não pode alterar o perfil que você mesmo usa. Peça a um super admin." };
  await prisma.role.update({
    where: { id },
    // O super admin sempre tem tudo: só o nome e a descrição mudam.
    data: role.key === SUPER_ADMIN ? parsed.data : { ...parsed.data, permissions },
  });
  await logActivity(user, "editou", "acesso", `Editou as permissões do perfil ${parsed.data.name}`, id);
  refresh();
  return { success: "Perfil salvo. As permissões valem a partir da próxima página aberta por quem usa este perfil." };
}

export async function deleteRole(id: string) {
  const user = await requireAccess("perfis", 3);
  const role = await prisma.role.findUnique({ where: { id }, select: { name: true, system: true } });
  if (!role) redirect("/admin/perfis");
  if (role.system) redirect(`/admin/perfis/${id}?erro=sistema`);
  // Quem usava o perfil passa para Atendente (o mais restrito do sistema).
  const fallback = await prisma.role.findUnique({ where: { key: "atendente" }, select: { id: true } });
  await prisma.user.updateMany({ where: { roleId: id }, data: { roleId: fallback?.id ?? null } });
  await prisma.role.delete({ where: { id } });
  await logActivity(user, "excluiu", "acesso", `Excluiu o perfil de acesso ${role.name}`, id);
  refresh();
  redirect("/admin/perfis");
}
