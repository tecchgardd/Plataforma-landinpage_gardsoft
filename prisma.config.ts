import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// A CLI do Prisma não lê o .env.local sozinha.
config({ path: ".env.local", quiet: true });
config({ quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Migrações usam a conexão direta (sem pooler) do Neon; o app usa DATABASE_URL.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL || "",
  },
});
