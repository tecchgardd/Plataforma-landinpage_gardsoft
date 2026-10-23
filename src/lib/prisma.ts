import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

export type { Campaign, Client, Lead, Project } from "@/generated/prisma/client";
export { Prisma } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL não configurada. Veja o .env.example.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** Cliente do banco. A conexão só é criada no primeiro uso (o build não precisa do banco). */
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    const client = (globalForPrisma.prisma ??= createClient());
    const value = Reflect.get(client, prop);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

/** "2026-10-22" (campo de data do formulário) → Date para colunas @db.Date. */
export function toDbDate(value: string | null) {
  return value ? new Date(`${value}T00:00:00.000Z`) : null;
}

/** Date de coluna @db.Date → "2026-10-22". */
export function fromDbDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}
