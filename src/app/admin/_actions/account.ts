"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth, createAdminUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireAccess } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { firstError, formObject, optionalText, type FormState } from "@/lib/admin/form";
import { checkRoleChange } from "@/lib/roles";
import { SUPER_ADMIN } from "@/lib/permissions";

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_.]{3,30}$/, "Usuário: 3 a 30 caracteres, só letras, números, ponto e _.");

const profileSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome.").max(80),
  username: usernameSchema,
  email: z.email("E-mail inválido."),
  phone: optionalText(30),
  jobTitle: optionalText(60),
  image: z
    .string()
    .trim()
    .refine((v) => !v || /^\/api\/media\/[0-9a-f-]{36}$/.test(v), "Foto inválida.")
    .transform((v) => v || null),
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres.").max(128),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { message: "As senhas não conferem.", path: ["confirm"] });

async function uniqueness(id: string | null, email: string, username: string) {
  const [byEmail, byUsername] = await Promise.all([
    prisma.user.findFirst({ where: { email: email.toLowerCase(), ...(id ? { NOT: { id } } : {}) }, select: { id: true } }),
    prisma.user.findFirst({ where: { username, ...(id ? { NOT: { id } } : {}) }, select: { id: true } }),
  ]);
  if (byEmail) return "Já existe um usuário com este e-mail.";
  if (byUsername) return `O usuário "${username}" já existe.`;
  return null;
}

async function setPassword(userId: string, password: string) {
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(password);
  await prisma.account.updateMany({ where: { userId, providerId: "credential" }, data: { password: hash } });
}

async function updateUserProfile(id: string, formData: FormData): Promise<FormState & { name?: string }> {
  const parsed = profileSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const data = { ...parsed.data, email: parsed.data.email.toLowerCase() };
  const conflict = await uniqueness(id, data.email, data.username);
  if (conflict) return { error: conflict };
  await prisma.user.update({ where: { id }, data: { ...data, displayUsername: data.username } });
  return { name: data.name };
}

/* ---------- Perfil (o próprio usuário) ---------- */

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const result = await updateUserProfile(user.id, formData);
  if (result.error) return result;
  await logActivity(user, "editou", "perfil", "Atualizou o próprio perfil", user.id);
  revalidatePath("/admin", "layout");
  return { success: "Perfil atualizado." };
}

/* ---------- Módulo de usuários ---------- */

export async function createUser(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("usuarios", 2);
  const profile = profileSchema.safeParse(formObject(formData));
  if (!profile.success) return { error: firstError(profile.error) };
  const password = passwordSchema.safeParse(formObject(formData));
  if (!password.success) return { error: firstError(password.error) };
  const conflict = await uniqueness(null, profile.data.email, profile.data.username);
  if (conflict) return { error: conflict };
  const roleId = formData.get("roleId")?.toString() || null;
  const roleError = await checkRoleChange(null, roleId);
  if (roleError) return { error: roleError };

  let id: string;
  try {
    const created = await createAdminUser({ ...profile.data, password: password.data.password });
    id = created.id;
    await prisma.user.update({
      where: { id },
      data: { phone: profile.data.phone, jobTitle: profile.data.jobTitle, image: profile.data.image, roleId },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Não foi possível criar o usuário." };
  }
  await logActivity(user, "criou", "usuario", `Criou o acesso de ${profile.data.name} (@${profile.data.username})`, id);
  revalidatePath("/admin", "layout");
  redirect("/admin/usuarios");
}

export async function updateUser(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("usuarios", 2);
  const roleId = formData.get("roleId")?.toString();
  if (roleId !== undefined) {
    const roleError = await checkRoleChange(id, roleId || null);
    if (roleError) return { error: roleError };
  }
  const result = await updateUserProfile(id, formData);
  if (result.error) return result;
  if (roleId) await prisma.user.update({ where: { id }, data: { roleId } });
  await logActivity(user, "editou", "usuario", `Editou o usuário ${result.name}`, id);
  revalidatePath("/admin", "layout");
  return { success: "Usuário atualizado." };
}

export async function resetUserPassword(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("usuarios", 2);
  const parsed = passwordSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const target = await prisma.user.findUnique({ where: { id }, select: { name: true } });
  if (!target) return { error: "Usuário não encontrado." };
  await setPassword(id, parsed.data.password);
  // Encerra as sessões abertas do usuário, exceto quando é o próprio admin trocando a sua.
  if (id !== user.id) await prisma.session.deleteMany({ where: { userId: id } });
  await logActivity(user, "editou", "usuario", `Redefiniu a senha de ${target.name}`, id);
  return { success: "Senha redefinida." };
}

export async function deleteUser(id: string) {
  const user = await requireAccess("usuarios", 3);
  if (id === user.id) redirect(`/admin/usuarios/${id}?erro=proprio`);
  if ((await prisma.user.count()) <= 1) redirect(`/admin/usuarios/${id}?erro=ultimo`);
  const target = await prisma.user.findUnique({ where: { id }, select: { name: true, role: { select: { key: true } } } });
  if (target?.role?.key === SUPER_ADMIN && (await prisma.user.count({ where: { role: { key: SUPER_ADMIN } } })) <= 1)
    redirect(`/admin/usuarios/${id}?erro=ultimo-admin`);
  await prisma.user.deleteMany({ where: { id } });
  if (target) await logActivity(user, "excluiu", "usuario", `Excluiu o usuário ${target.name}`, id);
  revalidatePath("/admin", "layout");
  redirect("/admin/usuarios");
}
