"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma, toDbDate } from "@/lib/prisma";
import { requireAccess } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { readUpload } from "@/lib/files";
import { firstError, formObject, optionalDate, optionalText, optionalUuid, type FormState } from "@/lib/admin/form";

const optionalUrl = z
  .string()
  .trim()
  .refine((v) => !v || z.url().safeParse(v).success, "Link inválido: use o endereço completo, com https://")
  .transform((v) => v || null);

const projectSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do projeto.").max(120),
  clientId: optionalUuid,
  ownerId: optionalText(60),
  service: optionalText(60),
  stage: z.string().trim().min(1, "Escolha a coluna do quadro.").max(60),
  startDate: optionalDate,
  dueDate: optionalDate,
  description: optionalText(20000),
  url: optionalUrl,
  githubUrl: optionalUrl,
  previewUrl: optionalUrl,
  designUrl: optionalUrl,
  docsUrl: optionalUrl,
  notes: optionalText(4000),
});

const refresh = () => revalidatePath("/admin", "layout");
/** Nome de cada coluna do quadro (as colunas são configuráveis, então vêm do banco). */
async function columnNames() {
  const columns = await prisma.projectColumn.findMany({ select: { id: true, name: true } });
  const names = new Map(columns.map((c) => [c.id, c.name]));
  return (id: string) => names.get(id) ?? id;
}

async function systemNote(projectId: string, author: string, text: string) {
  await prisma.projectNote.create({ data: { projectId, author, text, kind: "sistema" } });
}

export async function saveProject(id: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("projetos", 2);
  const parsed = projectSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  // Valores ficam só no orçamento vinculado ao projeto.
  const { startDate, dueDate, ...rest } = parsed.data;
  const data = { ...rest, startDate: toDbDate(startDate), dueDate: toDbDate(dueDate) };
  const stageLabel = await columnNames();
  if (!(await prisma.projectColumn.findUnique({ where: { id: data.stage }, select: { id: true } }))) {
    return { error: "Essa coluna do quadro não existe mais. Recarregue a página e escolha outra." };
  }

  if (id) {
    const before = await prisma.project.findUnique({ where: { id }, select: { stage: true } });
    await prisma.project.update({ where: { id }, data });
    if (before && before.stage !== data.stage) {
      await systemNote(id, user.name, `Moveu de "${stageLabel(before.stage)}" para "${stageLabel(data.stage)}".`);
    }
    await logActivity(user, "editou", "projeto", `Editou o projeto ${data.name}`, id);
    refresh();
    return { success: "Projeto atualizado." };
  }

  const last = await prisma.project.aggregate({ where: { stage: data.stage }, _max: { position: true } });
  const created = await prisma.project.create({
    data: { ...data, ownerId: data.ownerId ?? user.id, position: (last._max.position ?? -1) + 1 },
    select: { id: true },
  });
  await systemNote(created.id, user.name, "Projeto criado.");
  await logActivity(user, "criou", "projeto", `Criou o projeto ${data.name}`, created.id);
  refresh();
  redirect(`/admin/projetos?projeto=${created.id}`);
}

/** Arrastar e soltar no quadro: coloca o card na coluna `stage`, na posição `index`. */
export async function moveProjectTo(id: string, stage: string, index: number) {
  const user = await requireAccess("projetos", 2);
  const target = await prisma.projectColumn.findUnique({ where: { id: stage }, select: { id: true } });
  if (!target) return;
  const project = await prisma.project.findUnique({ where: { id }, select: { stage: true, name: true } });
  if (!project) return;
  const stageLabel = await columnNames();

  const column = await prisma.project.findMany({
    where: { stage: target.id, NOT: { id } },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const order = column.map((c) => c.id);
  order.splice(Math.max(0, Math.min(index, order.length)), 0, id);
  await prisma.$transaction(
    order.map((pid, position) =>
      prisma.project.update({ where: { id: pid }, data: pid === id ? { stage: target.id, position } : { position } }),
    ),
  );

  if (project.stage !== target.id) {
    await systemNote(id, user.name, `Moveu de "${stageLabel(project.stage)}" para "${stageLabel(target.id)}".`);
    await logActivity(user, "moveu", "projeto", `Moveu ${project.name} para "${stageLabel(target.id)}"`, id);
  }
  refresh();
}

export async function deleteProject(id: string) {
  const user = await requireAccess("projetos", 3);
  const project = await prisma.project.findUnique({ where: { id }, select: { name: true } });
  await prisma.project.deleteMany({ where: { id } });
  if (project) await logActivity(user, "excluiu", "projeto", `Excluiu o projeto ${project.name}`, id);
  refresh();
  redirect("/admin/projetos");
}

/* ---------- colunas do quadro ---------- */

export type ColumnResult = { error?: string };

const columnSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome para a coluna.").max(40, "Use um nome com até 40 caracteres."),
  wipLimit: z.number().int().min(1, "O limite WIP precisa ser pelo menos 1.").max(99).nullable(),
  done: z.boolean(),
});

/** Nova coluna no fim do quadro (ou logo depois de `afterId`). */
export async function createColumn(name: string, afterId?: string): Promise<ColumnResult> {
  const user = await requireAccess("projetos", 2);
  const parsed = columnSchema.shape.name.safeParse(name);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const columns = await prisma.projectColumn.findMany({ orderBy: [{ position: "asc" }, { createdAt: "asc" }], select: { id: true } });
  if (columns.length >= 20) return { error: "O quadro aceita no máximo 20 colunas." };
  const after = afterId ? columns.findIndex((c) => c.id === afterId) : -1;
  const at = after >= 0 ? after + 1 : columns.length;
  const order = columns.map((c) => c.id);
  await prisma.$transaction(async (tx) => {
    const created = await tx.projectColumn.create({ data: { name: parsed.data, position: at }, select: { id: true } });
    order.splice(at, 0, created.id);
    for (const [position, cid] of order.entries()) {
      await tx.projectColumn.update({ where: { id: cid }, data: { position } });
    }
  });
  await logActivity(user, "criou", "projeto", `Criou a coluna "${parsed.data}" no quadro de projetos`);
  refresh();
  return {};
}

/** Renomeia a coluna, define o limite WIP e se ela é a coluna de entrega. */
export async function updateColumn(id: string, input: { name: string; wipLimit: number | null; done: boolean }): Promise<ColumnResult> {
  const user = await requireAccess("projetos", 2);
  const parsed = columnSchema.safeParse(input);
  if (!parsed.success) return { error: firstError(parsed.error) };
  const before = await prisma.projectColumn.findUnique({ where: { id }, select: { name: true } });
  if (!before) return { error: "Coluna não encontrada. Recarregue a página." };
  await prisma.projectColumn.update({ where: { id }, data: parsed.data });
  const renamed = before.name !== parsed.data.name ? ` (antes "${before.name}")` : "";
  await logActivity(user, "editou", "projeto", `Editou a coluna "${parsed.data.name}"${renamed} do quadro de projetos`);
  refresh();
  return {};
}

/** Nova ordem das colunas, da esquerda para a direita (lista com todas as colunas). */
export async function reorderColumns(ids: string[]): Promise<ColumnResult> {
  await requireAccess("projetos", 2);
  const current = await prisma.projectColumn.findMany({ select: { id: true } });
  const known = new Set(current.map((c) => c.id));
  if (ids.length !== known.size || new Set(ids).size !== ids.length || !ids.every((cid) => known.has(cid))) {
    return { error: "O quadro mudou enquanto você organizava. Recarregue a página." };
  }
  await prisma.$transaction(ids.map((cid, position) => prisma.projectColumn.update({ where: { id: cid }, data: { position } })));
  refresh();
  return {};
}

/** Exclui a coluna; os projetos dela vão para o fim da coluna `moveTo`. */
export async function deleteColumn(id: string, moveTo: string): Promise<ColumnResult> {
  const user = await requireAccess("projetos", 3);
  if (id === moveTo) return { error: "Escolha outra coluna para receber os projetos." };
  const [column, target] = await Promise.all([
    prisma.projectColumn.findUnique({ where: { id }, select: { name: true, projects: { select: { id: true }, orderBy: [{ position: "asc" }, { createdAt: "asc" }] } } }),
    prisma.projectColumn.findUnique({ where: { id: moveTo }, select: { name: true } }),
  ]);
  if (!column || !target) return { error: "Coluna não encontrada. Recarregue a página." };

  const last = await prisma.project.aggregate({ where: { stage: moveTo }, _max: { position: true } });
  const start = (last._max.position ?? -1) + 1;
  await prisma.$transaction([
    ...column.projects.map((p, i) => prisma.project.update({ where: { id: p.id }, data: { stage: moveTo, position: start + i } })),
    prisma.projectColumn.delete({ where: { id } }),
  ]);
  for (const p of column.projects) {
    await systemNote(p.id, user.name, `A coluna "${column.name}" foi excluída: projeto movido para "${target.name}".`);
  }
  const moved = column.projects.length ? ` e moveu ${column.projects.length} projeto(s) para "${target.name}"` : "";
  await logActivity(user, "excluiu", "projeto", `Excluiu a coluna "${column.name}" do quadro de projetos${moved}`);
  refresh();
  return {};
}

/* ---------- checklist ---------- */

export async function addTask(projectId: string, title: string) {
  await requireAccess("projetos", 2);
  const clean = title.trim().slice(0, 200);
  if (!clean) return;
  const last = await prisma.projectTask.aggregate({ where: { projectId }, _max: { position: true } });
  await prisma.projectTask.create({ data: { projectId, title: clean, position: (last._max.position ?? -1) + 1 } });
  refresh();
}

export async function toggleTask(id: string, done: boolean) {
  const user = await requireAccess("projetos", 2);
  const task = await prisma.projectTask.update({
    where: { id },
    data: { done },
    select: { title: true, projectId: true, project: { select: { name: true } } },
  });
  if (done) await logActivity(user, "concluiu", "projeto", `Concluiu "${task.title}" em ${task.project.name}`, task.projectId);
  refresh();
}

export async function deleteTask(id: string) {
  await requireAccess("projetos", 2);
  await prisma.projectTask.deleteMany({ where: { id } });
  refresh();
}

/* ---------- atualizações ---------- */

export async function addNote(projectId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("projetos", 2);
  const text = String(formData.get("text") ?? "").trim();
  if (!text) return { error: "Escreva a atualização." };
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
  if (!project) return { error: "Projeto não encontrado." };
  await prisma.projectNote.create({ data: { projectId, text: text.slice(0, 4000), author: user.name } });
  await logActivity(user, "comentou", "projeto", `Registrou uma atualização em ${project.name}`, projectId);
  refresh();
  return { success: "Atualização registrada." };
}

export async function deleteNote(id: string) {
  await requireAccess("projetos", 2);
  await prisma.projectNote.deleteMany({ where: { id, kind: "nota" } });
  refresh();
}

/* ---------- documentação ---------- */

export async function uploadProjectFile(projectId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("projetos", 2);
  const file = await readUpload(formData);
  if ("error" in file) return { error: file.error };
  const label = String(formData.get("label") ?? "").trim().slice(0, 80) || null;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { name: true } });
  if (!project) return { error: "Projeto não encontrado." };
  await prisma.projectFile.create({ data: { projectId, label, ...file } });
  await logActivity(user, "anexou", "projeto", `Anexou "${label ?? file.name}" ao projeto ${project.name}`, projectId);
  refresh();
  return { success: "Arquivo anexado." };
}

export async function deleteProjectFile(fileId: string) {
  const user = await requireAccess("projetos", 2);
  const file = await prisma.projectFile.findUnique({ where: { id: fileId }, select: { projectId: true, name: true, label: true } });
  if (!file) return;
  await prisma.projectFile.delete({ where: { id: fileId } });
  await logActivity(user, "excluiu", "projeto", `Removeu o anexo "${file.label ?? file.name}"`, file.projectId);
  refresh();
}
