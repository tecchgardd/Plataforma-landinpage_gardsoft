import "server-only";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { FinanceSettings } from "./settings";
import { money } from "./contract";
import { itemTotal, quoteSubtotal, type QuoteItem } from "./quote";
import { BLUE, fmtDate, fmtDateTime, INK, LINE, MUTED, Shield, SOFT } from "./pdf-brand";

const s = StyleSheet.create({
  page: { paddingTop: 96, paddingBottom: 64, fontFamily: "Helvetica", fontSize: 9.5, color: INK, lineHeight: 1.45 },
  band: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 76,
    backgroundColor: BLUE,
    paddingHorizontal: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center" },
  word: { fontFamily: "Helvetica-Bold", fontSize: 16, color: "#FFFFFF", letterSpacing: 1.2, marginLeft: 8 },
  wordLight: { fontFamily: "Helvetica", color: "#CFE6FF" },
  bandRight: { alignItems: "flex-end" },
  bandSmall: { color: "#CFE6FF", fontSize: 8 },
  bandNumber: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 11 },
  body: { paddingHorizontal: 40 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 17, lineHeight: 1.25, marginBottom: 6 },
  subtitle: { color: MUTED, marginBottom: 16 },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: BLUE, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },
  parties: { flexDirection: "row", gap: 12 },
  party: { flex: 1, backgroundColor: SOFT, borderRadius: 6, padding: 12, borderWidth: 1, borderColor: LINE },
  partyLabel: { fontFamily: "Helvetica-Bold", fontSize: 8, color: BLUE, letterSpacing: 0.8, marginBottom: 4 },
  partyName: { fontFamily: "Helvetica-Bold", fontSize: 10.5, marginBottom: 3 },
  muted: { color: MUTED },
  para: { marginBottom: 5, textAlign: "justify" },
  table: { borderWidth: 1, borderColor: LINE, borderRadius: 6 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 7, paddingHorizontal: 10 },
  th: { fontFamily: "Helvetica-Bold", color: MUTED, fontSize: 8.5 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 10 },
  total: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 9, paddingHorizontal: 10, backgroundColor: SOFT },
  box: { borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 12 },
  footerLine: { position: "absolute", bottom: 40, left: 40, right: 40, borderTopWidth: 1, borderTopColor: LINE },
  footerLeft: { position: "absolute", bottom: 24, left: 40, fontSize: 7.5, color: MUTED },
});

export type QuotePdfData = {
  number: string;
  title: string;
  intro: string | null;
  items: QuoteItem[];
  discountCents: number;
  totalCents: number;
  validUntil: string | null;
  deliveryDays: number | null;
  paymentTerms: string | null;
  notes: string | null;
  recipient: { display: string; name: string; company: string | null; email: string | null; phone: string | null; document: string | null };
  decision: { status: "aprovado" | "recusado"; name: string; at: Date } | null;
};

const lines = (text: string | null) => (text ?? "").split(/\n+/).filter(Boolean);

function QuoteDocument({
  data,
  settings,
  issuer,
  issuedAt,
  approveUrl,
}: {
  data: QuotePdfData;
  settings: FinanceSettings;
  issuer: string;
  issuedAt: Date;
  approveUrl: string;
}) {
  const c = settings.company;
  const r = data.recipient;
  const subtotal = quoteSubtotal(data.items);

  return (
    <Document title={`${data.number} — ${data.title}`} author="Gardsoft" subject="Orçamento">
      <Page size="A4" style={s.page}>
        <View style={s.band} fixed>
          <View style={s.brand}>
            <Shield />
            <Text style={s.word}>
              GARD<Text style={s.wordLight}>SOFT</Text>
            </Text>
          </View>
          <View style={s.bandRight}>
            <Text style={s.bandSmall}>Orçamento</Text>
            <Text style={s.bandNumber}>{data.number}</Text>
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.title}>{data.title}</Text>
          <Text style={s.subtitle}>
            Emitido em {fmtDateTime(issuedAt)} por {issuer}
            {data.validUntil ? ` · Válido até ${fmtDate(data.validUntil)}` : ""}
          </Text>

          <View style={s.parties}>
            <View style={s.party}>
              <Text style={s.partyLabel}>DE</Text>
              <Text style={s.partyName}>{c.tradeName || c.legalName || "Gardsoft"}</Text>
              {c.document ? <Text>CNPJ: {c.document}</Text> : null}
              {c.cityState ? <Text style={s.muted}>{c.cityState}</Text> : null}
              {c.email || c.phone ? <Text style={s.muted}>{[c.email, c.phone].filter(Boolean).join(" · ")}</Text> : null}
              {c.website ? <Text style={s.muted}>{c.website}</Text> : null}
            </View>
            <View style={s.party}>
              <Text style={s.partyLabel}>PARA</Text>
              <Text style={s.partyName}>{r.display}</Text>
              {r.company ? <Text>A/C: {r.name}</Text> : null}
              {r.document ? <Text>CPF/CNPJ: {r.document}</Text> : null}
              {r.email || r.phone ? <Text style={s.muted}>{[r.email, r.phone].filter(Boolean).join(" · ")}</Text> : null}
            </View>
          </View>

          {lines(data.intro).length > 0 ? (
            <View style={{ marginTop: 14 }}>
              {lines(data.intro).map((p, i) => (
                <Text key={i} style={s.para}>
                  {p}
                </Text>
              ))}
            </View>
          ) : null}

          <Text style={s.h2}>Serviços</Text>
          <View style={s.table}>
            <View style={s.tr}>
              <Text style={[s.th, { flex: 4 }]}>Descrição</Text>
              <Text style={[s.th, { flex: 0.7, textAlign: "right" }]}>Qtd.</Text>
              <Text style={[s.th, { flex: 1.3, textAlign: "right" }]}>Unitário</Text>
              <Text style={[s.th, { flex: 1.3, textAlign: "right" }]}>Total</Text>
            </View>
            {data.items.map((item, i) => (
              <View key={i} style={s.tr} wrap={false}>
                <View style={{ flex: 4, paddingRight: 8 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>{item.description}</Text>
                  {lines(item.details).map((d, j) => (
                    <Text key={j} style={s.muted}>
                      {d}
                    </Text>
                  ))}
                </View>
                <Text style={{ flex: 0.7, textAlign: "right" }}>{String(item.quantity).replace(".", ",")}</Text>
                <Text style={{ flex: 1.3, textAlign: "right" }}>{money(item.unitCents)}</Text>
                <Text style={{ flex: 1.3, textAlign: "right" }}>{money(itemTotal(item))}</Text>
              </View>
            ))}
            {data.discountCents > 0 ? (
              <>
                <View style={s.sumRow}>
                  <Text style={s.muted}>Subtotal</Text>
                  <Text>{money(subtotal)}</Text>
                </View>
                <View style={s.sumRow}>
                  <Text style={s.muted}>Desconto</Text>
                  <Text>− {money(data.discountCents)}</Text>
                </View>
              </>
            ) : null}
            <View style={s.total}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Valor total</Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{money(data.totalCents)}</Text>
            </View>
          </View>

          <Text style={s.h2}>Condições</Text>
          <View style={s.box}>
            {data.deliveryDays ? <Text>Prazo estimado de entrega: {data.deliveryDays} dias após a aprovação e o recebimento dos materiais.</Text> : null}
            {data.paymentTerms ? <Text>Pagamento: {data.paymentTerms}</Text> : null}
            {data.validUntil ? <Text>Validade da proposta: até {fmtDate(data.validUntil)}.</Text> : null}
          </View>

          {lines(data.notes).length > 0 ? (
            <>
              <Text style={s.h2}>Observações</Text>
              {lines(data.notes).map((p, i) => (
                <Text key={i} style={s.para}>
                  {p}
                </Text>
              ))}
            </>
          ) : null}

          <View wrap={false} style={[s.box, { marginTop: 18, backgroundColor: SOFT }]}>
            {data.decision ? (
              <Text style={{ fontFamily: "Helvetica-Bold" }}>
                {data.decision.status === "aprovado" ? "Aprovado" : "Recusado"} por {data.decision.name} em {fmtDateTime(data.decision.at)}.
              </Text>
            ) : (
              <>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>Aprove este orçamento online</Text>
                <Text style={s.muted}>{approveUrl}</Text>
              </>
            )}
          </View>
        </View>

        <View style={s.footerLine} fixed />
        <Text style={s.footerLeft} fixed>
          {data.number} · {c.legalName || "Gardsoft"}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderQuotePdf(props: Parameters<typeof QuoteDocument>[0]) {
  return renderToBuffer(<QuoteDocument {...props} />);
}
