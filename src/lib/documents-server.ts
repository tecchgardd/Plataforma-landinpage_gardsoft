import "server-only";
import { prisma } from "./prisma";
import { siteUrl } from "./site-url";
import { sectionsSchema, type DocSection } from "./documents";

/** DOC-2026-001, sequencial por ano. */
export async function nextDocumentNumber() {
  const year = new Date().getFullYear();
  const prefix = `DOC-${year}-`;
  const last = await prisma.projectDocument.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" }, select: { number: true } });
  const seq = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

export const documentUrl = (token: string) => `${siteUrl}/documento/${token}`;

export const parseSections = (value: unknown): DocSection[] => {
  const parsed = sectionsSchema.safeParse(value);
  return parsed.success ? parsed.data : [];
};

/** Documento com cliente, projeto, autor e anexos de imagem (para a página pública e o PDF). */
export async function loadDocument(where: { id: string } | { token: string }) {
  const doc = await prisma.projectDocument.findUnique({
    where,
    include: {
      client: { select: { id: true, name: true, company: true, email: true, document: true } },
      project: { select: { id: true, name: true } },
      createdBy: { select: { name: true, email: true } },
      files: { select: { id: true, name: true, label: true, mime: true, size: true, createdAt: true }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!doc) return null;
  return { ...doc, sections: parseSections(doc.sections) };
}

/** Imagens anexadas em data URI (para o PDF), no máximo 8 e 4 MB cada. */
export async function documentImages(documentId: string) {
  const files = await prisma.documentFile.findMany({
    where: { documentId, mime: { in: ["image/png", "image/jpeg"] }, size: { lte: 4 * 1024 * 1024 } },
    select: { label: true, name: true, mime: true, data: true },
    orderBy: { createdAt: "asc" },
    take: 8,
  });
  return files.map((f) => ({ label: f.label ?? f.name, src: `data:${f.mime};base64,${Buffer.from(f.data).toString("base64")}` }));
}

/** PDF do documento com a marca Gardsoft (minuta ou aprovado). */
export async function documentPdf(where: { id: string } | { token: string }) {
  const { renderDocumentPdf } = await import("./DocumentPdf");
  const doc = await loadDocument(where);
  if (!doc) return null;
  const buffer = await renderDocumentPdf({
    number: doc.number,
    type: doc.type,
    title: doc.title,
    version: doc.version,
    status: doc.status,
    clientName: doc.client ? (doc.client.company ?? doc.client.name) : null,
    projectName: doc.project?.name ?? null,
    author: doc.createdBy?.name ?? null,
    updatedAt: doc.updatedAt,
    sections: doc.sections,
    images: await documentImages(doc.id),
    approval:
      doc.status === "aprovado" && doc.decidedAt && doc.approverName
        ? { name: doc.approverName, email: doc.approverEmail ?? "", at: doc.decidedAt, ip: doc.approverIp ?? "", hash: doc.contentHash ?? "" }
        : null,
  });
  return { buffer, filename: `${doc.number}-v${doc.version}.pdf` };
}
