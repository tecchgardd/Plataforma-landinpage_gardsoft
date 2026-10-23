import { z } from "zod";

const str = (max = 300) => z.string().trim().max(max);
const list = (max = 12, len = 80) => z.array(str(len)).max(max);
const url = z.union([z.literal(""), z.url("URL inválida.")]);

/** Cabeçalho padrão das seções: etiqueta, título com trecho em destaque e texto de apoio. */
const heading = {
  eyebrow: str(60),
  title: str(120),
  highlight: str(120),
  text: str(400),
};

export const siteSchema = z.object({
  whatsapp: str(20).regex(/^\d*$/, "WhatsApp: somente dígitos, com país e DDD."),
  email: z.union([z.literal(""), z.email("E-mail inválido.")]),
  instagram: url,
  facebook: url,
  linkedin: url,
  tiktok: url,
  youtube: url,
});

export const heroSchema = z.object({
  badge: str(90),
  line1: str(40),
  line2: str(40),
  highlight: str(40),
  typedPrefix: str(30),
  typedWords: list(8, 40).min(1, "Informe pelo menos uma palavra."),
  lead: str(300),
  primaryCta: str(50),
  secondaryCta: str(50),
  pillars: list(4, 40),
});

export const marqueeSchema = z.object({ items: list(16, 40).min(1, "Informe pelo menos um item.") });

export const serviceSchema = z.object({
  icon: z.enum(["landing", "site", "system", "automation"]),
  tag: str(40),
  title: str(60).min(1),
  description: str(400),
  features: list(6),
  contact: str(60),
});

export const caseSchema = z.object({
  name: str(60).min(1),
  type: str(60),
  segment: str(60),
  url,
  theme: z.enum(["sea", "glass", "music"]),
  kicker: str(80),
  headline: str(120),
  summary: str(400),
  tags: list(6),
  image: str(300),
  video: str(300).default(""),
  published: z.boolean(),
});

export const contentSchemas = {
  hero: heroSchema,
  marquee: marqueeSchema,
  services: z.object({ ...heading, items: z.array(serviceSchema).max(8) }),
  story: z.object({
    ...heading,
    quote: str(200),
    quoteAuthor: str(60),
    chapters: z.array(z.object({ label: str(40), title: str(80).min(1), text: str(600) })).max(10),
    values: z.array(z.object({ title: str(40).min(1), text: str(160) })).max(6),
  }),
  cases: z.object({
    ...heading,
    items: z.array(caseSchema).max(30),
    nextTitle: str(80),
    nextText: str(200),
    nextCta: str(40),
  }),
  banners: z.object({
    ideaKicker: str(60),
    ideaTitle: str(120),
    ideaText: str(240),
    ideaCta: str(50),
    leftKicker: str(80),
    leftTitle: str(100),
    leftText: str(240),
    leftCta: str(40),
    rightKicker: str(80),
    rightTitle: str(100),
    rightText: str(240),
    rightCta: str(40),
  }),
  process: z.object({
    ...heading,
    items: z.array(z.object({ title: str(60).min(1), text: str(300), detail: str(40) })).max(10),
    ctaText: str(160),
    ctaButton: str(40),
  }),
  testimonials: z.object({
    ...heading,
    items: z.array(z.object({ text: str(500).min(1), name: str(60).min(1), role: str(80) })).max(30),
  }),
  faq: z.object({
    ...heading,
    items: z.array(z.object({ q: str(200).min(1), a: str(800).min(1) })).max(20),
  }),
  finalCta: z.object({
    badge: str(60),
    title: str(80),
    highlight: str(80),
    text: str(240),
    primaryCta: str(50),
    secondaryCta: str(40),
  }),
  footer: z.object({
    description: str(240),
    contactText: str(120),
    bottomText: str(120),
  }),
  site: siteSchema,
};

export type ContentKey = keyof typeof contentSchemas;
export type SiteContent = { [K in ContentKey]: z.infer<(typeof contentSchemas)[K]> };
export type SiteSettings = SiteContent["site"];
export type Service = z.infer<typeof serviceSchema>;
export type CaseItem = z.infer<typeof caseSchema>;
