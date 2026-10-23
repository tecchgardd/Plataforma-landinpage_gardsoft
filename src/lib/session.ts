import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth, ensureAdminUser } from "./auth";

export const getSession = cache(async () => {
  const requestHeaders = await headers();
  await ensureAdminUser();
  return auth.api.getSession({ headers: requestHeaders });
});

/** Protege páginas e ações do portal. Toda server action do admin deve chamar isto. */
export async function requireUser() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  return session.user;
}
