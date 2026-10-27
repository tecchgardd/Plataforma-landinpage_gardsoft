import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getSession } from "./session";
import { sessionExpiry } from "./session-policy";
import { levelOf, levelsOf, SUPER_ADMIN, type Level, type ModuleKey } from "./permissions";

/** Usuário logado + perfil de acesso (uma consulta por requisição). */
export const getAccess = cache(async () => {
  const session = await getSession();
  if (!session) return null;
  const record = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: { select: { id: true, key: true, name: true, permissions: true } } },
  });
  const role = record?.role ?? null;
  return {
    user: session.user,
    /** Quando a sessão expira (prazo fixo de 4h desde o login). */
    expiresAt: sessionExpiry(session.session),
    role,
    isSuperAdmin: role?.key === SUPER_ADMIN,
    level: (module: ModuleKey) => levelOf(role, module),
    levels: levelsOf(role),
  };
});

/**
 * Protege páginas, server actions e APIs por módulo.
 * Sem login → tela de login; sem o nível pedido → página "sem acesso".
 * Devolve o usuário, como o requireUser.
 */
export async function requireAccess(module: ModuleKey, min: Level = 1) {
  const access = await getAccess();
  if (!access) redirect("/admin/login");
  if (access.level(module) < min) redirect(`/admin/sem-acesso?modulo=${module}&nivel=${min}`);
  return access.user;
}

/** Para rotas de API: true quando pode ver o módulo. */
export async function canAccess(module: ModuleKey, min: Level = 1) {
  const access = await getAccess();
  return Boolean(access && access.level(module) >= min);
}
