"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma, toDbDate } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logActivity } from "@/lib/activity";
import { readUpload } from "@/lib/files";
import { parseMoney } from "@/lib/admin/format";
import { labelOf, projectStages, values } from "@/lib/admin/options";
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
  stage: z.enum(values(projectStages)),
  value: z.string().transform(parseMoney),
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
const stageLabel = (stage: string) => labelOf(projectStages, stage);

async function systemNote(projectId: string, author: string, text: string) {
  await prisma.projectNote.create({ data: { projectId, author, text, kind: "sistema" } });
}

export async function saveProject(id: string | null, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = projectSchema.safeParse(formObject(formData));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { value, startDate, dueDate, ...rest } = parsed.data;
  const data = { ...rest, valueCents: value, startDate: toDbDate(startDate), dueDate: toDbDate(dueDate) };

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
  const user = await requireUser();
  const target = z.enum(values(projectStages)).safeParse(stage);
  if (!target.success) return;
  const project = await prisma.project.findUnique({ where: { id }, select: { stage: true, name: true } });
  if (!project) return;

  const column = await prisma.project.findMany({
    where: { stage: target.data, NOT: { id } },
    orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    select: { id: true },
  });
  const order = column.map((c) => c.id);
  order.splice(Math.max(0, Math.min(index, order.length)), 0, id);
  await prisma.$transaction(
    order.map((pid, position) =>
      prisma.project.update({ where: { id: pid }, data: pid === id ? { stage: target.data, position } : { position } }),
    ),
  );

  if (project.stage !== target.data) {
    await systemNote(id, user.name, `Moveu de "${stageLabel(project.stage)}" para "${stageLabel(target.data)}".`);
    await logActivity(user, "moveu", "projeto", `Moveu ${project.name} para "${stageLabel(target.data)}"`, id);
  }
  refresh();
}

export async function deleteProject(id: string) {
  const user = await requireUser();
  const project = await prisma.project.findUnique({ where: { id }, select: { name: true } });
  await prisma.project.deleteMany({ where: { id } });
  if (project) await logActivity(user, "excluiu", "projeto", `Excluiu o projeto ${project.name}`, id);
  refresh();
  redirect("/admin/projetos");
}

/* ---------- checklist ---------- */

export async function addTask(projectId: string, title: string) {
  await requireUser();
  const clean = title.trim().slice(0, 200);
  if (!clean) return;
  const last = await prisma.projectTask.aggregate({ where: { projectId }, _max: { position: true } });
  await prisma.projectTask.create({ data: { projectId, title: clean, position: (last._max.position ?? -1) + 1 } });
  refresh();
}

export async function toggleTask(id: string, done: boolean) {
  const user = await requireUser();
  const task = await prisma.projectTask.update({
    where: { id },
    data: { done },
    select: { title: true, projectId: true, project: { select: { name: true } } },
  });
  if (done) await logActivity(user, "concluiu", "projeto", `Concluiu "${task.title}" em ${task.project.name}`, task.projectId);
  refresh();
}

export async function deleteTask(id: string) {
  await requireUser();
  await prisma.projectTask.deleteMany({ where: { id } });
  refresh();
}

/* ---------- atualizações ---------- */

export async function addNote(projectId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
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
  await requireUser();
  await prisma.projectNote.deleteMany({ where: { id, kind: "nota" } });
  refresh();
}

/* ---------- documentação ---------- */

export async function uploadProjectFile(projectId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
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
  const user = await requireUser();
  const file = await prisma.projectFile.findUnique({ where: { id: fileId }, select: { projectId: true, name: true, label: true } });
  if (!file) return;
  await prisma.projectFile.delete({ where: { id: fileId } });
  await logActivity(user, "excluiu", "projeto", `Removeu o anexo "${file.label ?? file.name}"`, file.projectId);
  refresh();
}
