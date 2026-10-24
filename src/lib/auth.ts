import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { prisma } from "./prisma";
import { siteUrl, vercelOrigins } from "./site-url";

const baseURL = siteUrl;

export const auth = betterAuth({
  appName: "Gardsoft",
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL,
  trustedOrigins: [baseURL, ...vercelOrigins],
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // Ninguém se cadastra pelo site: administradores são criados pelo portal (Minha conta).
    disableSignUp: true,
    minPasswordLength: 8,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 14,
    updateAge: 60 * 60 * 24,
  },
  rateLimit: {
    enabled: true,
    window: 60,
    max: 30,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-in/username": { window: 60, max: 5 },
    },
  },
  plugins: [username(), nextCookies()],
});

/** Cria um administrador direto pelo adaptador interno (o cadastro público fica desligado). */
export async function createAdminUser(input: { name: string; email: string; password: string; username?: string }) {
  const ctx = await auth.$context;
  const email = input.email.trim().toLowerCase();
  const login = input.username?.trim().toLowerCase() || null;
  if (await ctx.internalAdapter.findUserByEmail(email)) throw new Error("Já existe um usuário com este e-mail.");
  if (login && (await prisma.user.findUnique({ where: { username: login }, select: { id: true } })))
    throw new Error(`O usuário "${login}" já existe.`);
  const hash = await ctx.password.hash(input.password);
  const created = await ctx.internalAdapter.createUser(
    { name: input.name.trim(), email, emailVerified: true, username: login, displayUsername: login },
    { method: "email-password" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password: hash,
  });
  return created;
}

const DEV_DEFAULT_PASSWORD = "admin";

function bootstrapCredentials() {
  const password = process.env.ADMIN_PASSWORD || (process.env.NODE_ENV === "production" ? "" : DEV_DEFAULT_PASSWORD);
  return {
    name: process.env.ADMIN_NAME || "Administrador",
    username: process.env.ADMIN_USERNAME || "admin",
    email: process.env.ADMIN_EMAIL || "admin@gardsoft.local",
    password,
  };
}

let bootstrap: Promise<void> | null = null;

/**
 * Garante que exista um administrador: com o banco vazio, cria o acesso de ADMIN_USERNAME/ADMIN_PASSWORD.
 * Em desenvolvimento, sem variáveis, o acesso é admin/admin. Em produção, só cria se ADMIN_PASSWORD estiver definida.
 */
export function ensureAdminUser() {
  bootstrap ??= (async () => {
    if ((await prisma.user.count()) > 0) return;
    const creds = bootstrapCredentials();
    if (!creds.password) {
      console.warn("[gardsoft] Nenhum administrador cadastrado. Defina ADMIN_PASSWORD para criar o primeiro acesso.");
      return;
    }
    await createAdminUser(creds);
    console.info(`[gardsoft] Administrador "${creds.username}" criado.`);
  })().catch((error) => {
    bootstrap = null;
    throw error;
  });
  return bootstrap;
}

/** Verdadeiro enquanto o usuário ainda usa a senha padrão de desenvolvimento. */
export async function usesDefaultPassword(userId: string) {
  const ctx = await auth.$context;
  const accounts = await ctx.internalAdapter.findAccounts(userId);
  const hash = accounts.find((a) => a.providerId === "credential")?.password;
  return hash ? ctx.password.verify({ hash, password: DEV_DEFAULT_PASSWORD }) : false;
}
