"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logSystem } from "@/lib/activity";
import { contentHash, loadContract, money, verificationCode } from "@/lib/finance/contract";
import { contractPdf } from "@/lib/finance/contract-pdf";
import { isValidCpfCnpj } from "@/lib/finance/document";
import { createAsaasCharge, createEntriesFromContract, emailCharge } from "@/lib/finance/billing";
import { getFinanceSettings } from "@/lib/finance/settings";
import { asaasConfigured } from "@/lib/integrations/asaas";
import { emailConfigured, emailLayout, sendEmail } from "@/lib/integrations/email";

export type SignState = { error?: string; signed?: boolean };

const signSchema = z.object({
  name: z.string().trim().min(5, "Informe seu nome completo.").max(120),
  document: z.string().trim().refine(isValidCpfCnpj, "CPF ou CNPJ inválido."),
  email: z.email("E-mail inválido."),
  accept: z.literal("on", { error: "Confirme que leu e concorda com o contrato." }),
  signature: z
    .string()
    .startsWith("data:image/png;base64,", "Desenhe sua assinatura no quadro.")
    .max(400_000, "Assinatura muito grande. Limpe e desenhe novamente.")
    .refine((v) => {
      const bytes = Buffer.from(v.slice("data:image/png;base64,".length, 40), "base64");
      return bytes.subarray(0, 4).toString("latin1") === "\x89PNG";
    }, "Assinatura inválida. Desenhe novamente."),
});

// Limite simples por IP para tentativas de assinatura.
const attempts = new Map<string, number[]>();
function tooMany(key: string) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > 10;
}

export async function signContract(token: string, _: SignState, formData: FormData): Promise<SignState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
  if (tooMany(ip)) return { error: "Muitas tentativas. Aguarde alguns minutos." };

  const parsed = signSchema.safeParse({
    name: formData.get("name"),
    document: formData.get("document"),
    email: formData.get("email"),
    accept: formData.get("accept"),
    signature: formData.get("signature"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const loaded = await loadContract({ token });
  if (!loaded) return { error: "Contrato não encontrado." };
  const { contract, data } = loaded;
  if (contract.status === "assinado") return { signed: true };
  if (contract.status !== "enviado" && contract.status !== "visualizado") return { error: "Este contrato não está disponível para assinatura." };

  const settings = await getFinanceSettings();
  const hash = contentHash(data, settings);
  const signedAt = new Date();
  // Atualização condicional: evita dupla assinatura em envios simultâneos.
  const result = await prisma.contract.updateMany({
    where: { id: contract.id, status: { in: ["enviado", "visualizado"] } },
    data: {
      status: "assinado",
      signedAt,
      signerName: parsed.data.name,
      signerDocument: parsed.data.document,
      signerEmail: parsed.data.email.toLowerCase(),
      signerIp: ip,
      signerUserAgent: (h.get("user-agent") ?? "").slice(0, 300),
      signatureImage: parsed.data.signature,
      contentHash: hash,
    },
  });
  if (result.count === 0) return { signed: true };

  await logSystem("assinou", "contrato", `${parsed.data.name} assinou o contrato ${contract.number}`, contract.id, `${parsed.data.name} (cliente)`);
  if (contract.projectId) {
    await prisma.projectNote.create({
      data: {
        projectId: contract.projectId,
        kind: "sistema",
        author: "Sistema",
        text: `Contrato ${contract.number} assinado por ${parsed.data.name} (código ${verificationCode(hash)}).`,
      },
    });
  }

  // Pós-assinatura: nada aqui pode desfazer a assinatura; falhas vão para o histórico.
  try {
    if (settings.billing.createOnSign) {
      const ids = await createEntriesFromContract(contract.id);
      if (asaasConfigured()) {
        for (const id of ids) {
          await createAsaasCharge(id);
          if (emailConfigured()) await emailCharge(id);
        }
      }
    }
  } catch (error) {
    await logSystem("erro", "financeiro", `Cobranças do contrato ${contract.number} não geradas: ${error instanceof Error ? error.message : "erro"}`, contract.id);
  }

  if (emailConfigured()) {
    try {
      const pdf = await contractPdf({ id: contract.id });
      const attachments = pdf ? [{ filename: pdf.filename, content: pdf.buffer }] : [];
      const html = emailLayout({
        title: "Contrato assinado ✓",
        paragraphs: [
          `O contrato ${contract.number} — ${contract.title} foi assinado por ${parsed.data.name}.`,
          `Valor total: ${money(contract.valueCents)}. Código de verificação: ${verificationCode(hash)}.`,
          "A via assinada segue em anexo. As cobranças serão enviadas conforme o plano de pagamento.",
        ],
      });
      await sendEmail({ to: parsed.data.email, subject: `Contrato ${contract.number} assinado — Gardsoft`, html, attachments });
      if (settings.company.email) {
        await sendEmail({ to: settings.company.email, subject: `✓ ${contract.client.company ?? contract.client.name} assinou o contrato ${contract.number}`, html, attachments });
      }
    } catch (error) {
      await logSystem("erro", "contrato", `E-mail do contrato assinado não enviado: ${error instanceof Error ? error.message : "erro"}`, contract.id);
    }
  }

  revalidatePath(`/contrato/${token}`);
  revalidatePath("/admin", "layout");
  return { signed: true };
}
