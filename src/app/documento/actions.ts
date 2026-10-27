"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimited } from "@/lib/security";
import { logSystem } from "@/lib/activity";
import { documentHash, typeOf } from "@/lib/documents";
import { loadDocument } from "@/lib/documents-server";
import { emailConfigured, emailLayout, sendEmail } from "@/lib/integrations/email";
import { siteUrl } from "@/lib/site-url";

export type DecisionState = { error?: string; done?: "aprovado" | "ajustes" };

const schema = z
  .object({
    decision: z.enum(["aprovar", "ajustes"]),
    name: z.string().trim().min(5, "Informe seu nome completo.").max(120),
    email: z.email("E-mail inválido."),
    note: z.string().trim().max(3000),
    accept: z.string().optional(),
  })
  .refine((d) => d.decision === "ajustes" || d.accept === "on", { message: "Confirme que leu e aprova o documento.", path: ["accept"] })
  .refine((d) => d.decision === "aprovar" || d.note.length >= 10, { message: "Descreva os ajustes (pelo menos uma frase).", path: ["note"] });

export async function decideDocument(token: string, _: DecisionState, formData: FormData): Promise<DecisionState> {
  const h = await headers();
  const ip = await clientIp();
  if (await rateLimited(`documento:${ip}`, 10, 600)) return { error: "Muitas tentativas. Aguarde alguns minutos." };
  const parsed = schema.safeParse({
    decision: formData.get("decision"),
    name: formData.get("name"),
    email: formData.get("email"),
    note: formData.get("note") ?? "",
    accept: formData.get("accept") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const doc = await loadDocument({ token });
  if (!doc) return { error: "Documento não encontrado." };
  if (doc.status === "aprovado") return { done: "aprovado" };
  if (doc.status !== "enviado" && doc.status !== "visualizado") return { error: "Este documento não está disponível para aprovação." };

  const { decision, name, email, note } = parsed.data;
  const approve = decision === "aprovar";
  // Atualização condicional: evita decisão dupla em envios simultâneos.
  const updated = await prisma.projectDocument.updateMany({
    where: { id: doc.id, status: { in: ["enviado", "visualizado"] }, version: doc.version },
    data: approve
      ? {
          status: "aprovado",
          decidedAt: new Date(),
          approverName: name,
          approverEmail: email.toLowerCase(),
          approverIp: ip,
          approverAgent: (h.get("user-agent") ?? "").slice(0, 300),
          contentHash: documentHash(doc),
        }
      : { status: "ajustes", decidedAt: new Date() },
  });
  if (updated.count === 0) return { error: "O documento mudou enquanto você lia. Recarregue a página." };

  await prisma.documentEvent.create({
    data: { documentId: doc.id, kind: approve ? "aprovado" : "ajustes", version: doc.version, actor: `${name} (${email.toLowerCase()})`, note: note || null },
  });
  const client = doc.client ? (doc.client.company ?? doc.client.name) : name;
  await logSystem(
    approve ? "aprovou" : "pediu ajustes",
    "documento",
    approve ? `Aprovou o documento ${doc.number} — ${doc.title}` : `Pediu ajustes no documento ${doc.number}: ${note.slice(0, 140)}`,
    doc.id,
    `${client} (cliente)`,
  );

  // Avisa quem criou o documento.
  if (emailConfigured() && doc.createdBy?.email) {
    const kind = typeOf(doc.type);
    await sendEmail({
      to: doc.createdBy.email,
      subject: approve ? `✓ ${kind.short} ${doc.number} aprovado por ${client}` : `${kind.short} ${doc.number}: ${client} pediu ajustes`,
      html: emailLayout({
        title: approve ? "Documento aprovado" : "Pedido de ajustes",
        paragraphs: [
          `${name} ${approve ? "aprovou" : "pediu ajustes em"} ${doc.number} — ${doc.title} (versão ${doc.version}).`,
          ...(note ? [`Comentário: “${note}”`] : []),
        ],
        button: { label: "Abrir no portal", url: `${siteUrl}/admin/documentos/${doc.id}` },
      }),
    }).catch(() => undefined);
  }
  revalidatePath("/admin", "layout");
  revalidatePath(`/documento/${token}`);
  return { done: approve ? "aprovado" : "ajustes" };
}
