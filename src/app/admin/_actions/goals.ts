"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { parseMoney } from "@/lib/admin/format";
import type { FormState } from "@/lib/admin/form";
import { goalMetrics } from "@/lib/bi";

/** Salva as metas de um mês. Campo vazio remove a meta. */
export async function saveGoals(month: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("bi", 2);
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { error: "Mês inválido." };
  let saved = 0;
  for (const m of goalMetrics) {
    const raw = String(formData.get(m.key) ?? "").trim();
    if (!raw) {
      await prisma.goal.deleteMany({ where: { month, metric: m.key } });
      continue;
    }
    const target = m.unit === "money" ? parseMoney(raw) : Math.round(Number(raw.replace(",", ".")) * (m.unit === "percent" ? 100 : 1));
    if (!Number.isFinite(target) || target <= 0) return { error: `Meta inválida em "${m.label}".` };
    await prisma.goal.upsert({ where: { month_metric: { month, metric: m.key } }, create: { month, metric: m.key, target }, update: { target } });
    saved++;
  }
  await logActivity(user, "editou", "meta", `Definiu ${saved} meta(s) para ${month}`, null);
  revalidatePath("/admin/bi");
  return { success: saved ? `${saved} meta(s) salvas para o mês.` : "Metas do mês removidas." };
}

/** Copia as metas do mês anterior (atalho para planejar). */
export async function copyPreviousGoals(month: string, _: FormState): Promise<FormState> {
  const user = await requireAccess("bi", 2);
  const [y, m] = month.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const goals = await prisma.goal.findMany({ where: { month: prev } });
  if (goals.length === 0) return { error: "O mês anterior não tem metas." };
  for (const g of goals) {
    await prisma.goal.upsert({ where: { month_metric: { month, metric: g.metric } }, create: { month, metric: g.metric, target: g.target }, update: { target: g.target } });
  }
  await logActivity(user, "editou", "meta", `Copiou as metas de ${prev} para ${month}`, null);
  revalidatePath("/admin/bi");
  return { success: `${goals.length} meta(s) copiadas de ${prev}.` };
}

/** Link de um relatório publicado no Power BI (Arquivo → Inserir relatório → Site ou portal). */
export async function saveBiSettings(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("bi", 2);
  const url = String(formData.get("powerBiUrl") ?? "").trim();
  if (url && !/^https:\/\/app\.powerbi\.com\/(reportEmbed|view)\?/i.test(url))
    return { error: "Use o link de incorporação do Power BI (começa com https://app.powerbi.com/reportEmbed? ou /view?)." };
  await prisma.content.upsert({ where: { key: "config:bi" }, create: { key: "config:bi", value: { powerBiUrl: url } }, update: { value: { powerBiUrl: url } } });
  await logActivity(user, "editou", "meta", url ? "Conectou um relatório do Power BI" : "Removeu o relatório do Power BI", null);
  revalidatePath("/admin/bi");
  return { success: url ? "Relatório do Power BI conectado." : "Relatório removido." };
}
