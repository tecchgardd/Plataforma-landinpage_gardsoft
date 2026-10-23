import "server-only";
import { loadQuote, quoteUrl, recipientOf } from "./quote";
import { renderQuotePdf } from "./QuotePdf";
import { getFinanceSettings } from "./settings";
import { getContent } from "@/lib/content";

/** "5548999990000" → "(48) 99999-0000"; vazio quando não é um número brasileiro. */
function phoneLabel(digits: string) {
  const d = digits.replace(/\D/g, "").replace(/^55(?=\d{10,11}$)/, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return "";
}

/** Gera o PDF do orçamento (com a aprovação ou recusa, se já decidido). */
export async function quotePdf(where: { id: string } | { token: string }) {
  const loaded = await loadQuote(where);
  if (!loaded) return null;
  const { quote, items } = loaded;
  const [settings, site] = await Promise.all([getFinanceSettings(), getContent("site")]);
  const decided = (quote.status === "aprovado" || quote.status === "recusado") && quote.decidedAt;
  const buffer = await renderQuotePdf({
    data: {
      number: quote.number,
      title: quote.title,
      intro: quote.intro,
      items,
      discountCents: quote.discountCents,
      totalCents: quote.totalCents,
      validUntil: quote.validUntil?.toISOString().slice(0, 10) ?? null,
      deliveryDays: quote.deliveryDays,
      paymentTerms: quote.paymentTerms,
      notes: quote.notes,
      recipient: recipientOf(quote),
      decision: decided ? { status: quote.status as "aprovado" | "recusado", name: quote.decisionName ?? "", at: quote.decidedAt! } : null,
    },
    settings,
    contact: { email: site.email, phone: phoneLabel(site.whatsapp) },
    issuer: quote.createdBy?.name ?? "Gardsoft",
    issuedAt: quote.sentAt ?? quote.createdAt,
    approveUrl: quoteUrl(quote.token),
  });
  return { buffer, filename: `${quote.number}.pdf`, quote };
}
