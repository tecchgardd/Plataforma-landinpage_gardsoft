import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, ensureAdminUser } from "./auth";
import { prisma } from "./prisma";
import { sessionExpiry } from "./session-policy";

export const getSession = cache(async () => {
  const requestHeaders = await headers();
  await ensureAdminUser();
  const session = await auth.api.getSession({ headers: requestHeaders });
  if (!session) return null;
  // Prazo fixo de 4h desde o login. Vale também para sessões abertas antes dessa regra (que duravam 14 dias):
  // passou do prazo, a sessão é encerrada e a pessoa volta para o login.
  if (Date.now() >= sessionExpiry(session.session).getTime()) {
    await prisma.session.deleteMany({ where: { id: session.session.id } });
    return null;
  }
  return session;
});

/** Protege páginas e ações do portal. Toda server action do admin deve chamar isto. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session.user;
}
