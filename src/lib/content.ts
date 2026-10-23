import "server-only";
import { prisma } from "./prisma";
import { defaults } from "@/data/defaults";
import { contentSchemas, type ContentKey, type SiteContent } from "./content-schema";

/** Lê todo o conteúdo do site. O que não estiver no banco (ou estiver inválido) usa o padrão. */
export async function getSiteContent(): Promise<SiteContent> {
  const result = { ...defaults } as SiteContent;
  if (!process.env.DATABASE_URL) return result;
  try {
    const rows = await prisma.content.findMany();
    for (const row of rows) {
      const key = row.key as ContentKey;
      if (!(key in contentSchemas)) continue;
      const parsed = contentSchemas[key].safeParse(row.value);
      if (parsed.success) (result as Record<ContentKey, unknown>)[key] = parsed.data;
    }
  } catch (error) {
    console.error("Falha ao ler o conteúdo do banco; usando o conteúdo padrão.", error);
  }
  return result;
}

export async function getContent<K extends ContentKey>(key: K): Promise<SiteContent[K]> {
  return (await getSiteContent())[key];
}
