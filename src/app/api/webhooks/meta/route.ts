import { prisma } from "@/lib/prisma";
import { logSystem } from "@/lib/activity";
import { fetchMetaLead, metaLeadsConfigured, validMetaSignature, type MetaLead } from "@/lib/integrations/meta";

/**
 * Webhook do Meta Lead Ads: cada formulário preenchido num anúncio vira um lead no portal.
 * No app da Meta (developers.facebook.com → Webhooks → Page → campo "leadgen"):
 *   URL de retorno: https://SEU-DOMINIO/api/webhooks/meta
 *   Token de verificação: o mesmo valor de META_VERIFY_TOKEN
 * E a Página precisa estar inscrita no app (subscribed_apps com "leadgen").
 */

/** Verificação do cadastro do webhook (a Meta chama com hub.challenge). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ok = url.searchParams.get("hub.mode") === "subscribe" && process.env.META_VERIFY_TOKEN && url.searchParams.get("hub.verify_token") === process.env.META_VERIFY_TOKEN;
  return ok ? new Response(url.searchParams.get("hub.challenge") ?? "", { status: 200 }) : new Response("Forbidden", { status: 403 });
}

type Payload = { object?: string; entry?: { changes?: { field?: string; value?: { leadgen_id?: string; form_id?: string; ad_id?: string } }[] }[] };

/** Campo do formulário pelo nome (a Meta usa full_name, email, phone_number... ou o rótulo da pergunta personalizada). */
const pick = (lead: MetaLead, ...names: string[]) => lead.field_data.find((f) => names.includes(f.name.toLowerCase()))?.values?.[0]?.trim() || null;

export async function POST(request: Request) {
  const raw = await request.text();
  if (!metaLeadsConfigured() || !validMetaSignature(raw, request.headers.get("x-hub-signature-256"))) return new Response("Unauthorized", { status: 401 });
  const body = JSON.parse(raw || "{}") as Payload;
  const ids = (body.entry ?? []).flatMap((e) => (e.changes ?? []).filter((c) => c.field === "leadgen").map((c) => c.value?.leadgen_id)).filter(Boolean) as string[];

  for (const leadgenId of ids) {
    const eventId = `meta_lead_${leadgenId}`;
    // A Meta reenvia o mesmo evento: só cria o lead uma vez.
    if (await prisma.webhookEvent.findUnique({ where: { id: eventId } })) continue;
    try {
      const lead = await fetchMetaLead(leadgenId);
      const campaign = lead.campaign_id ? await prisma.campaign.findUnique({ where: { metaCampaignId: lead.campaign_id }, select: { id: true, slug: true } }) : null;
      const name = pick(lead, "full_name", "nome_completo", "nome") ?? ([pick(lead, "first_name"), pick(lead, "last_name")].filter(Boolean).join(" ") || "Lead do Meta Ads");
      const known = new Set(["full_name", "first_name", "last_name", "nome", "nome_completo", "email", "phone_number", "telefone", "company_name", "empresa"]);
      const answers = lead.field_data.filter((f) => !known.has(f.name.toLowerCase())).map((f) => `${f.name.replace(/_/g, " ")}: ${f.values.join(", ")}`);
      const created = await prisma.lead.create({
        data: {
          name: name.slice(0, 120),
          email: pick(lead, "email")?.toLowerCase() ?? null,
          phone: pick(lead, "phone_number", "telefone"),
          company: pick(lead, "company_name", "empresa"),
          message: [`Formulário do ${lead.platform === "ig" ? "Instagram" : "Facebook"}${lead.ad_name ? ` · anúncio "${lead.ad_name}"` : ""}`, ...answers].join("\n"),
          source: "meta",
          temperature: "quente",
          campaignId: campaign?.id ?? null,
          utmSource: lead.platform === "ig" ? "instagram" : "facebook",
          utmMedium: "lead_ads",
          utmCampaign: campaign?.slug ?? lead.campaign_name ?? null,
        },
        select: { id: true },
      });
      await prisma.webhookEvent.create({ data: { id: eventId, source: "meta", event: "leadgen" } });
      await logSystem("recebeu", "lead", `Recebeu o lead ${name} pelo formulário do Meta Ads${lead.campaign_name ? ` (${lead.campaign_name})` : ""}`, created.id, "Meta Ads");
    } catch (error) {
      console.error("Webhook Meta", leadgenId, error);
      // 500 faz a Meta tentar de novo mais tarde.
      return new Response("Error", { status: 500 });
    }
  }
  return Response.json({ ok: true });
}
