"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { APIError } from "better-auth/api";
import { auth, ensureAdminUser } from "@/lib/auth";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { clearRateLimit, clientIp, rateLimited } from "@/lib/security";
import type { FormState } from "@/lib/admin/form";

/**
 * Login, saída e troca de senha rodam aqui, no servidor: o navegador só envia o formulário.
 * O Better Auth é chamado direto (auth.api) e grava o cookie de sessão pelo plugin nextCookies,
 * então a API /api/auth não precisa ficar exposta.
 */

const tooMany = "Muitas tentativas. Aguarde alguns minutos e tente de novo.";

/** Devolve o login digitado para o formulário não apagá-lo quando a senha está errada. */
export type SignInState = { error?: string; login?: string };

export async function signIn(_: SignInState, formData: FormData): Promise<SignInState> {
  const login = String(formData.get("login") ?? "").trim().toLowerCase().slice(0, 120);
  const password = String(formData.get("password") ?? "").slice(0, 200);
  const rememberMe = formData.get("remember") === "on";
  if (!login || !password) return { error: "Informe o usuário e a senha.", login };

  // Dois limites: por IP (robô testando vários usuários) e por usuário (vários IPs atacando a mesma conta).
  if (await rateLimited(`login:ip:${await clientIp()}`, 20, 600)) return { error: tooMany, login };
  if (await rateLimited(`login:user:${login}`, 5, 900)) return { error: tooMany, login };

  await ensureAdminUser();
  const requestHeaders = await headers();
  try {
    // Aceita o nome de usuário (ex.: admin) ou o e-mail.
    if (login.includes("@")) await auth.api.signInEmail({ body: { email: login, password, rememberMe }, headers: requestHeaders });
    else await auth.api.signInUsername({ body: { username: login, password, rememberMe }, headers: requestHeaders });
  } catch (error) {
    if (error instanceof APIError) return { error: "Usuário ou senha incorretos.", login };
    throw error;
  }
  await clearRateLimit(`login:user:${login}`);
  redirect("/admin");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/admin/login");
}

export async function changePassword(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const currentPassword = String(formData.get("current") ?? "");
  const newPassword = String(formData.get("new") ?? "");
  if (newPassword.length < 8) return { error: "A nova senha precisa de pelo menos 8 caracteres." };
  if (newPassword.length > 128) return { error: "A nova senha pode ter no máximo 128 caracteres." };
  if (newPassword !== formData.get("confirm")) return { error: "As senhas não conferem." };
  if (await rateLimited(`senha:${user.id}`, 5, 900)) return { error: tooMany };

  try {
    // Encerra as outras sessões: quem tinha a senha antiga perde o acesso na hora.
    await auth.api.changePassword({ body: { currentPassword, newPassword, revokeOtherSessions: true }, headers: await headers() });
  } catch (error) {
    if (error instanceof APIError) return { error: "Senha atual incorreta." };
    throw error;
  }
  await logActivity(user, "editou", "usuario", "Trocou a própria senha", user.id);
  return { success: "Senha alterada com sucesso." };
}
