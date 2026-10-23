import "server-only";
import { loadQuote, quoteUrl, recipientOf } from "./quote";
import { renderQuotePdf } from "./QuotePdf";
import { getFinanceSettings } from "./settings";

/** Gera o PDF do orçamento (com a aprovação ou recusa, se já decidido). */
export async function quotePdf(where: { id: string } | { token: string }) {
  const loaded = await loadQuote(where);
  if (!loaded) return null;
  const { quote, items } = loaded;
  const settings = await getFinanceSettings();
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
    issuer: quote.createdBy?.name ?? "Gardsoft",
    issuedAt: quote.sentAt ?? quote.createdAt,
    approveUrl: quoteUrl(quote.token),
  });
  return { buffer, filename: `${quote.number}.pdf`, quote };
}
