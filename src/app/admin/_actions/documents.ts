"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/access";
import { logActivity } from "@/lib/activity";
import { readUpload } from "@/lib/files";
import { firstError, formObject, optionalUuid, type FormState } from "@/lib/admin/form";
import { documentTypes, newDocumentToken, sectionsSchema, templateSections, typeOf } from "@/lib/documents";
import { documentPdf, documentUrl, nextDocumentNumber } from "@/lib/documents-server";
import { emailConfigured, emailLayout, sendEmail } from "@/lib/integrations/email";

const refresh = () => revalidatePath("/admin", "layout");
const EDITABLE = ["rascunho", "ajustes"];

const baseSchema = z.object({
  title: z.string().trim().min(3, "Dê um título ao documento.").max(160),
  projectId: optionalUuid,
  clientId: optionalUuid,
});

/** Cliente do documento: o escolhido ou, se faltar, o do projeto. */
async function resolveClient(projectId: string | null, clientId: string | null) {
  if (clientId || !projectId) return clientId;
  const project = await prisma.project.findUnique({ where: { id: projectId }, select: { clientId: true } });
  return project?.clientId ?? null;
}

async function event(documentId: string, kind: string, version: number, actor: string | null, note?: string | null) {
  await prisma.documentEvent.create({ data: { documentId, kind, version, actor, note: note ?? null } });
}

export async function createDocument(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("documentos", 2);
  const f = formObject(formData);
  if (!documentTypes.some((t) => t.value === f.type)) return { error: "Escolha o tipo de documento." };
  const parsed = baseSchema.safeParse({ projectId: "", clientId: "", ...f });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const clientId = await resolveClient(parsed.data.projectId, parsed.data.clientId);
  const number = await nextDocumentNumber();
  const doc = await prisma.projectDocument.create({
    data: {
      ...parsed.data,
      clientId,
      number,
      type: f.type,
      sections: templateSections(f.type),
      token: newDocumentToken(),
      createdById: user.id,
    },
    select: { id: true },
  });
  await event(doc.id, "criado", 1, user.name);
  await logActivity(user, "criou", "documento", `Criou o documento ${number} — ${parsed.data.title} (${typeOf(f.type).short})`, doc.id);
  refresh();
  redirect(`/admin/documentos/${doc.id}`);
}

export async function saveDocument(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("documentos", 2);
  const doc = await prisma.projectDocument.findUnique({ where: { id }, select: { status: true, version: true, number: true } });
  if (!doc) return { error: "Documento não encontrado." };
  if (!EDITABLE.includes(doc.status)) return { error: "Este documento já foi enviado. Crie uma nova versão para alterar." };
  const parsed = baseSchema.safeParse({ projectId: "", clientId: "", ...formObject(formData) });
  if (!parsed.success) return { error: firstError(parsed.error) };
  let sections;
  try {
    sections = sectionsSchema.parse(JSON.parse(String(formData.get("sections") ?? "[]")));
  } catch {
    return { error: "Seções inválidas: cada seção precisa de um título." };
  }
  if (sections.length === 0) return { error: "O documento precisa de pelo menos uma seção." };
  const clientId = await resolveClient(parsed.data.projectId, parsed.data.clientId);
  // Depois de um pedido de ajustes, a primeira edição abre a próxima versão.
  const bump = doc.status === "ajustes";
  const version = bump ? doc.version + 1 : doc.version;
  await prisma.projectDocument.update({
    where: { id },
    data: { ...parsed.data, clientId, sections, version, status: "rascunho" },
  });
  await event(id, bump ? "versao" : "editado", version, user.name);
  await logActivity(user, "editou", "documento", `Editou o documento ${doc.number}${bump ? ` (versão ${version})` : ""}`, id);
  refresh();
  return { success: bump ? `Salvo como versão ${version}. Envie de novo para o cliente aprovar.` : "Documento salvo." };
}

/** Reabre um documento enviado/aprovado para edição, como nova versão (a aprovação anterior fica no histórico). */
export async function newDocumentVersion(id: string) {
  const user = await requireAccess("documentos", 2);
  const doc = await prisma.projectDocument.findUnique({ where: { id }, select: { version: true, number: true, status: true } });
  if (!doc || doc.status === "cancelado") redirect(`/admin/documentos/${id}`);
  const version = doc.version + 1;
  await prisma.projectDocument.update({
    where: { id },
    data: {
      version,
      status: "rascunho",
      // Novo link: o cliente não aprova por engano a versão anterior.
      token: newDocumentToken(),
      sentAt: null,
      viewedAt: null,
      decidedAt: null,
      approverName: null,
      approverEmail: null,
      approverIp: null,
      approverAgent: null,
      contentHash: null,
    },
  });
  await event(id, "versao", version, user.name);
  await logActivity(user, "editou", "documento", `Abriu a versão ${version} do documento ${doc.number}`, id);
  refresh();
  redirect(`/admin/documentos/${id}`);
}

/** Envia o link de leitura/aprovação (e o PDF) para o cliente. */
export async function sendDocument(id: string, _: FormState): Promise<FormState> {
  const user = await requireAccess("documentos", 2);
  const doc = await prisma.projectDocument.findUnique({ where: { id }, include: { client: true } });
  if (!doc) return { error: "Documento não encontrado." };
  if (!["rascunho", "enviado", "visualizado", "ajustes"].includes(doc.status)) return { error: "Este documento não pode ser enviado agora." };
  await prisma.projectDocument.update({ where: { id }, data: { status: doc.status === "visualizado" ? "visualizado" : "enviado", sentAt: new Date() } });
  await event(id, "enviado", doc.version, user.name, doc.client?.email ?? null);
  const link = documentUrl(doc.token);
  const kind = typeOf(doc.type);

  if (!emailConfigured() || !doc.client?.email) {
    await logActivity(user, "enviou", "documento", `Gerou o link de aprovação do documento ${doc.number}`, id);
    refresh();
    return {
      success: !doc.client?.email
        ? "Link gerado. O cliente não tem e-mail cadastrado: copie o link e envie pelo WhatsApp."
        : "Link gerado. O e-mail ainda não está configurado: copie o link e envie ao cliente.",
    };
  }
  try {
    const pdf = await documentPdf({ id });
    await sendEmail({
      to: doc.client.email,
      replyTo: user.email,
      subject: `${kind.short} ${doc.number} para aprovação — Gardsoft`,
      html: emailLayout({
        title: `${kind.short} para sua aprovação`,
        paragraphs: [
          `Olá, ${doc.client.name.split(" ")[0]}!`,
          `Preparamos o documento ${doc.number} — ${doc.title} (versão ${doc.version}).`,
          "Clique no botão para ler e aprovar, ou pedir ajustes com um comentário. O PDF também segue em anexo.",
        ],
        button: { label: "Ler e aprovar", url: link },
      }),
      attachments: pdf ? [{ filename: pdf.filename, content: pdf.buffer }] : [],
    });
  } catch (error) {
    return { error: `Link gerado, mas o e-mail falhou: ${error instanceof Error ? error.message : "erro desconhecido"}. Copie o link.` };
  }
  await logActivity(user, "enviou", "documento", `Enviou o documento ${doc.number} para ${doc.client.email}`, id);
  refresh();
  return { success: `Documento enviado para ${doc.client.email}.` };
}

/** Aprovação registrada pela equipe (cliente aprovou em reunião, por e-mail etc.). */
export async function approveDocumentManually(id: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("documentos", 2);
  const note = String(formData.get("note") ?? "").trim().slice(0, 500);
  if (note.length < 5) return { error: "Conte como o cliente aprovou (ex.: por e-mail em 20/10, na reunião...)." };
  const doc = await prisma.projectDocument.findUnique({ where: { id }, select: { number: true, version: true, status: true } });
  if (!doc || doc.status === "cancelado" || doc.status === "aprovado") return { error: "Este documento não pode ser aprovado agora." };
  await prisma.projectDocument.update({
    where: { id },
    data: { status: "aprovado", decidedAt: new Date(), approverName: `${user.name} (registrado pela equipe)`, approverEmail: user.email },
  });
  await event(id, "aprovado_manual", doc.version, user.name, note);
  await logActivity(user, "aprovou", "documento", `Registrou a aprovação do documento ${doc.number}: ${note}`, id);
  refresh();
  return { success: "Aprovação registrada." };
}

export async function cancelDocument(id: string) {
  const user = await requireAccess("documentos", 2);
  const doc = await prisma.projectDocument.update({ where: { id }, data: { status: "cancelado" }, select: { number: true, version: true } });
  await event(id, "cancelado", doc.version, user.name);
  await logActivity(user, "cancelou", "documento", `Cancelou o documento ${doc.number}`, id);
  refresh();
}

export async function deleteDocument(id: string) {
  const user = await requireAccess("documentos", 3);
  const doc = await prisma.projectDocument.findUnique({ where: { id }, select: { number: true, status: true } });
  if (!doc) redirect("/admin/documentos");
  if (doc.status === "aprovado") redirect(`/admin/documentos/${id}?erro=aprovado`);
  await prisma.projectDocument.delete({ where: { id } });
  await logActivity(user, "excluiu", "documento", `Excluiu o documento ${doc.number}`, id);
  refresh();
  redirect("/admin/documentos");
}

export async function uploadDocumentFile(documentId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireAccess("documentos", 2);
  const file = await readUpload(formData);
  if ("error" in file) return { error: file.error };
  const label = String(formData.get("label") ?? "").trim().slice(0, 80) || null;
  const doc = await prisma.projectDocument.findUnique({ where: { id: documentId }, select: { number: true } });
  if (!doc) return { error: "Documento não encontrado." };
  await prisma.documentFile.create({ data: { documentId, label, ...file } });
  await logActivity(user, "anexou", "documento", `Anexou "${label ?? file.name}" ao documento ${doc.number}`, documentId);
  refresh();
  return { success: "Arquivo anexado." };
}

export async function deleteDocumentFile(fileId: string) {
  await requireAccess("documentos", 2);
  await prisma.documentFile.deleteMany({ where: { id: fileId } });
  refresh();
}
