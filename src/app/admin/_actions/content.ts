"use server";

import { revalidatePath } from "next/cache";
import { prisma, Prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { contentSchemas, type ContentKey } from "@/lib/content-schema";
import type { FormState } from "@/lib/admin/form";
import { sections } from "../(panel)/conteudo/specs";

const sectionTitle = (key: string) => sections.find((s) => s.key === key)?.title ?? key;

function isKey(key: string): key is ContentKey {
  return key in contentSchemas;
}

export async function saveContent(key: string, json: string): Promise<FormState> {
  const user = await requireUser();
  if (!isKey(key)) return { error: "Seção desconhecida." };
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { error: "Conteúdo inválido." };
  }
  const parsed = contentSchemas[key].safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue.path.length ? ` (${issue.path.join(" › ")})` : "";
    return { error: `${issue.message}${where}` };
  }
  const value = parsed.data as Prisma.InputJsonValue;
  await prisma.content.upsert({ where: { key }, create: { key, value }, update: { value } });
  await logActivity(user, "publicou", "conteudo", `Publicou alterações na seção "${sectionTitle(key)}" do site`, key);
  revalidatePath("/");
  revalidatePath("/admin/conteudo", "layout");
  return { success: "Salvo! O site já foi atualizado." };
}

/** Volta a seção para o texto padrão do código. */
export async function resetContent(key: string): Promise<FormState> {
  const user = await requireUser();
  if (!isKey(key)) return { error: "Seção desconhecida." };
  await prisma.content.deleteMany({ where: { key } });
  await logActivity(user, "editou", "conteudo", `Restaurou o texto padrão da seção "${sectionTitle(key)}"`, key);
  revalidatePath("/");
  revalidatePath("/admin/conteudo", "layout");
  return { success: "Seção restaurada para o padrão." };
}
