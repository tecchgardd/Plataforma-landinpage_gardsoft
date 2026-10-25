import "server-only";
import { prisma } from "./prisma";
import { getAccess } from "./access";
import { SUPER_ADMIN } from "./permissions";

/**
 * Valida a troca de perfil de um usuário. Regras:
 * só super admin dá (ou tira) super admin; ninguém muda o próprio perfil; sempre sobra um super admin.
 */
export async function checkRoleChange(targetId: string | null, roleId: string | null): Promise<string | null> {
  const access = await getAccess();
  if (!access) return "Sessão expirada.";
  if (!roleId) return "Escolha o perfil de acesso.";
  const role = await prisma.role.findUnique({ where: { id: roleId }, select: { key: true } });
  if (!role) return "Perfil de acesso inválido.";
  if (!targetId) return role.key === SUPER_ADMIN && !access.isSuperAdmin ? "Só um super admin pode criar outro super admin." : null;

  const current = await prisma.user.findUnique({ where: { id: targetId }, select: { roleId: true, role: { select: { key: true } } } });
  if (current?.roleId === roleId) return null;
  if (targetId === access.user.id) return "Você não pode mudar o seu próprio perfil de acesso.";
  if ((role.key === SUPER_ADMIN || current?.role?.key === SUPER_ADMIN) && !access.isSuperAdmin) return "Só um super admin pode dar ou tirar o acesso de super admin.";
  if (current?.role?.key === SUPER_ADMIN) {
    const supers = await prisma.user.count({ where: { role: { key: SUPER_ADMIN } } });
    if (supers <= 1) return "Este é o último super admin. Promova outra pessoa antes.";
  }
  return null;
}
