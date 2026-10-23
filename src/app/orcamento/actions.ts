"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { logSystem } from "@/lib/activity";
import { money } from "@/lib/finance/contract";
import { loadQuote, isExpired, recipientOf } from "@/lib/finance/quote";
import { getFinanceSettings } from "@/lib/finance/settings";
import { emailConfigured, emailLayout, sendEmail } from "@/lib/integrations/email";

export type DecisionState = { error?: string; done?: boolean };

const decisionSchema = z.discriminatedUnion("decision", [
  z.object({
    decision: z.literal("aprovado"),
    name: z.string().trim().min(3, "Informe seu nome.").max(120),
    note: z.string().trim().max(1000),
    accept: z.literal("on", { error: "Confirme que concorda com o orçamento." }),
  }),
  z.object({
    decision: z.literal("recusado"),
    name: z.string().trim().min(3, "Informe seu nome.").max(120),
    note: z.string().trim().max(1000),
  }),
]);

// Limite simples por IP para respostas.
const attempts = new Map<string, number[]>();
function tooMany(key: string) {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  attempts.set(key, recent);
  return recent.length > 10;
}

export async function decideQuote(token: string, _: DecisionState, formData: FormData): Promise<DecisionState> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
  if (tooMany(ip)) return { error: "Muitas tentativas. Aguarde alguns minutos." };

  const parsed = decisionSchema.safeParse({
    decision: formData.get("decision"),
    name: formData.get("name") ?? "",
    note: formData.get("note") ?? "",
    accept: formData.get("accept") ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const loaded = await loadQuote({ token });
  if (!loaded) return { error: "Orçamento não encontrado." };
  const { quote } = loaded;
  if (quote.status === "aprovado" || quote.status === "recusado") return { done: true };
  if (quote.status !== "enviado" && quote.status !== "visualizado") return { error: "Este orçamento não está disponível para resposta." };
  if (isExpired(quote)) return { error: "A validade deste orçamento terminou. Fale com a Gardsoft para receber uma versão atualizada." };

  const { decision, name, note } = parsed.data;
  // Atualização condicional: evita duas respostas em envios simultâneos.
  const result = await prisma.quote.updateMany({
    where: { id: quote.id, status: { in: ["enviado", "visualizado"] } },
    data: { status: decision, decidedAt: new Date(), decisionName: name, decisionNote: note || null, decisionIp: ip },
  });
  if (result.count === 0) return { done: true };

  const to = recipientOf(quote);
  await logSystem(
    decision === "aprovado" ? "aprovou" : "recusou",
    "orcamento",
    `${decision === "aprovado" ? "Aprovou" : "Recusou"} o orçamento ${quote.number} (${money(quote.totalCents)})${note ? `: ${note}` : ""}`,
    quote.id,
    `${name} (cliente)`,
  );
  if (decision === "aprovado" && quote.leadId) {
    await prisma.lead.updateMany({ where: { id: quote.leadId, status: { notIn: ["fechado"] } }, data: { status: "negociacao", temperature: "quente" } });
  }

  if (emailConfigured()) {
    const settings = await getFinanceSettings();
    if (settings.company.email) {
      await sendEmail({
        to: settings.company.email,
        subject: `${decision === "aprovado" ? "✓" : "✗"} ${to.display} ${decision === "aprovado" ? "aprovou" : "recusou"} o orçamento ${quote.number}`,
        html: emailLayout({
          title: decision === "aprovado" ? "Orçamento aprovado ✓" : "Orçamento recusado",
          paragraphs: [
            `${name} ${decision === "aprovado" ? "aprovou" : "recusou"} o orçamento ${quote.number} — ${quote.title} (${money(quote.totalCents)}).`,
            note ? `Mensagem: “${note}”` : "",
            decision === "aprovado" ? "Abra o portal para gerar o contrato." : "",
          ].filter(Boolean),
        }),
      }).catch((e) => logSystem("erro", "orcamento", `Não enviou o aviso de resposta do orçamento: ${e.message}`, quote.id));
    }
  }

  revalidatePath(`/orcamento/${token}`);
  revalidatePath("/admin", "layout");
  return { done: true };
}
