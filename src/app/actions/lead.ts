"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export type LeadFormState = { ok: boolean; message: string; text?: string };

const leadSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(80),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => v.replace(/\D/g, "").length >= 10, "Informe um WhatsApp com DDD."),
  email: z.union([z.literal(""), z.email("E-mail inválido.")]),
  service: z.string().trim().max(60),
  idea: z.string().trim().min(5, "Conte um pouco sobre o projeto.").max(2000),
  utmSource: z.string().trim().max(100),
  utmMedium: z.string().trim().max(100),
  utmCampaign: z.string().trim().max(100),
});

// Limite simples por IP para evitar spam no formulário público.
const attempts = new Map<string, number[]>();
function tooMany(ip: string) {
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  attempts.set(ip, recent);
  return recent.length > 5;
}

export async function submitLead(_: LeadFormState, formData: FormData): Promise<LeadFormState> {
  // Campo invisível: robôs preenchem, pessoas não.
  if (formData.get("website")) return { ok: true, message: "Recebemos sua mensagem!" };

  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (tooMany(ip)) return { ok: false, message: "Muitas tentativas. Aguarde alguns minutos e tente novamente." };

  const field = (k: string) => String(formData.get(k) ?? "");
  const parsed = leadSchema.safeParse({
    name: field("name"),
    phone: field("phone"),
    email: field("email"),
    service: field("service"),
    idea: field("idea"),
    utmSource: field("utm_source"),
    utmMedium: field("utm_medium"),
    utmCampaign: field("utm_campaign"),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const data = parsed.data;

  try {
    const campaign = data.utmCampaign
      ? await prisma.campaign.findUnique({ where: { slug: data.utmCampaign.toLowerCase() }, select: { id: true } })
      : null;
    await prisma.lead.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        service: data.service || null,
        message: data.idea,
        source: data.utmSource ? "campanha" : "site",
        campaignId: campaign?.id ?? null,
        utmSource: data.utmSource || null,
        utmMedium: data.utmMedium || null,
        utmCampaign: data.utmCampaign || null,
      },
    });
  } catch (error) {
    console.error("Falha ao salvar lead", error);
    return { ok: false, message: "Não foi possível enviar agora. Tente novamente em instantes." };
  }

  return {
    ok: true,
    message: "Recebemos sua mensagem! Em breve entraremos em contato.",
    text: `Olá, Gardsoft! Meu nome é ${data.name}. Tenho interesse em ${data.service.toLowerCase() || "um projeto"}.\n\n${data.idea}`,
  };
}
