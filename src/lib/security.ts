import "server-only";
import { timingSafeEqual } from "node:crypto";
import { headers } from "next/headers";
import { prisma } from "./prisma";

/** IP de quem fez a requisição (na Vercel, x-forwarded-for é reescrito pela própria plataforma). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

/** Compara segredos em tempo constante (não revela, pelo tempo de resposta, quantos caracteres acertou). */
export function safeEqual(expected: string | undefined, received: string | null | undefined) {
  if (!expected || !received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Conta mais uma tentativa de `key` na janela e diz se passou do limite.
 * Fica no banco (uma única instrução atômica), então vale para todas as instâncias do servidor —
 * um Map em memória zera a cada instância nova e não segura ataque nenhum na Vercel.
 */
export async function rateLimited(key: string, max: number, windowSeconds: number) {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowSeconds * 1000);
  const [row] = await prisma.$queryRaw<{ count: number }[]>`
    INSERT INTO "rate_limits" ("key", "count", "reset_at") VALUES (${key}, 1, ${resetAt}::timestamptz)
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "rate_limits"."reset_at" <= ${now}::timestamptz THEN 1 ELSE "rate_limits"."count" + 1 END,
      "reset_at" = CASE WHEN "rate_limits"."reset_at" <= ${now}::timestamptz THEN EXCLUDED."reset_at" ELSE "rate_limits"."reset_at" END
    RETURNING "count"`;
  // Limpeza ocasional das janelas vencidas.
  if (Math.random() < 0.02) await prisma.rateLimit.deleteMany({ where: { resetAt: { lt: now } } });
  return Number(row.count) > max;
}

/** Zera o contador (ex.: login certo libera o usuário). */
export async function clearRateLimit(key: string) {
  await prisma.rateLimit.deleteMany({ where: { key } });
}
