import "server-only";
import { Document, Link, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { FinanceSettings } from "./settings";
import { money } from "./contract";
import { itemTotal, quoteSubtotal, type QuoteItem } from "./quote";
import { BLUE, fmtDate, fmtDateTime, INK, LINE, MUTED, Shield, SOFT } from "./pdf-brand";

// Grade de 4pt; margens laterais de 40pt. Helvetica padrão: evitar símbolos fora do WinAnsi (→, −, ✓).
const GREEN = "#067647";
const RED = "#B42318";

const s = StyleSheet.create({
  page: { paddingTop: 84, paddingBottom: 68, fontFamily: "Helvetica", fontSize: 9.5, color: INK, lineHeight: 1.45 },
  band: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: BLUE,
    paddingHorizontal: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: { flexDirection: "row", alignItems: "center" },
  word: { fontFamily: "Helvetica-Bold", fontSize: 15, color: "#FFFFFF", letterSpacing: 1.2, marginLeft: 8 },
  wordLight: { fontFamily: "Helvetica", color: "#CFE6FF" },
  bandRight: { alignItems: "flex-end" },
  bandSmall: { color: "#CFE6FF", fontSize: 7.5, letterSpacing: 1 },
  bandNumber: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 11 },
  body: { paddingHorizontal: 40 },

  kicker: { fontFamily: "Helvetica-Bold", fontSize: 8, color: BLUE, letterSpacing: 1, marginBottom: 4 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 20, lineHeight: 1.2, marginBottom: 4 },
  meta: { color: MUTED, fontSize: 8.5, marginBottom: 14 },

  summary: { flexDirection: "row", borderWidth: 1, borderColor: LINE, borderRadius: 8, marginBottom: 12 },
  sumCell: { flex: 1, paddingVertical: 10, paddingHorizontal: 14, borderLeftWidth: 1, borderLeftColor: LINE },
  sumFirst: { flex: 1.4, borderLeftWidth: 0, backgroundColor: SOFT, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 },
  sumLabel: { fontSize: 7.5, color: MUTED, letterSpacing: 0.8, marginBottom: 4 },
  sumBig: { fontFamily: "Helvetica-Bold", fontSize: 17, color: BLUE },
  sumValue: { fontFamily: "Helvetica-Bold", fontSize: 11.5 },

  parties: { flexDirection: "row", gap: 12 },
  party: { flex: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: LINE },
  label: { fontFamily: "Helvetica-Bold", fontSize: 7.5, color: BLUE, letterSpacing: 1, marginBottom: 6 },
  partyName: { fontFamily: "Helvetica-Bold", fontSize: 10.5, marginBottom: 2 },
  muted: { color: MUTED },
  para: { marginBottom: 6, textAlign: "justify" },

  h2: { fontFamily: "Helvetica-Bold", fontSize: 8, color: BLUE, letterSpacing: 1, marginTop: 16, marginBottom: 6 },
  table: { borderWidth: 1, borderColor: LINE, borderRadius: 8 },
  tr: { flexDirection: "row", alignItems: "flex-start", paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: LINE },
  zebra: { backgroundColor: "#FAFBFF" },
  th: { fontFamily: "Helvetica-Bold", color: MUTED, fontSize: 7.5, letterSpacing: 0.6 },
  idx: { width: 22, color: MUTED, fontSize: 8.5, paddingTop: 1 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: LINE },
  total: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: BLUE,
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7,
  },
  totalText: { fontFamily: "Helvetica-Bold", color: "#FFFFFF", fontSize: 11 },

  terms: { borderWidth: 1, borderColor: LINE, borderRadius: 8 },
  term: { flexDirection: "row", paddingVertical: 6, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: LINE },
  termLabel: { width: 84, fontFamily: "Helvetica-Bold", fontSize: 7.5, color: MUTED, letterSpacing: 0.6, paddingTop: 1.5 },
  termText: { flex: 1 },

  approve: { flexDirection: "row", gap: 12, marginTop: 16, alignItems: "stretch" },
  approveBox: { flex: 1.6, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, backgroundColor: SOFT, borderWidth: 1, borderColor: "#CFDCFF" },
  approveTitle: { fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 6 },
  steps: { flexDirection: "row", gap: 10, marginBottom: 6 },
  step: { flexDirection: "row", alignItems: "center" },
  stepDot: { width: 13, height: 13, borderRadius: 6.5, backgroundColor: BLUE, alignItems: "center", justifyContent: "center", marginRight: 7 },
  stepNum: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 7, lineHeight: 1 },
  link: { color: BLUE, fontSize: 8, textDecoration: "underline", marginTop: 4 },
  signBox: { flex: 1, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: LINE },
  signRow: { flexDirection: "row", gap: 12 },
  signLine: { borderBottomWidth: 1, borderBottomColor: INK, height: 24, marginBottom: 3 },
  signLabel: { fontSize: 7.5, color: MUTED },

  decision: { marginTop: 16, borderRadius: 8, padding: 14, borderWidth: 1 },

  footerLine: { position: "absolute", bottom: 48, left: 40, right: 40, borderTopWidth: 1, borderTopColor: LINE },
  footerLeft: { position: "absolute", bottom: 30, left: 40, right: 160, fontSize: 7.5, color: MUTED },
  footerRight: { position: "absolute", bottom: 30, left: 435, right: 40, fontSize: 7.5, color: MUTED, textAlign: "right" },
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
const join = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(" · ");

function QuoteDocument({
  data,
  settings,
  contact,
  issuer,
  issuedAt,
  approveUrl,
}: {
  data: QuotePdfData;
  settings: FinanceSettings;
  /** Contato do site, usado quando os dados da empresa ainda não foram preenchidos. */
  contact: { email: string; phone: string };
  issuer: string;
  issuedAt: Date;
  approveUrl: string;
}) {
  const c = settings.company;
  const r = data.recipient;
  const subtotal = quoteSubtotal(data.items);
  const companyName = c.tradeName || c.legalName || "Gardsoft";
  const email = c.email || contact.email;
  const phone = c.phone || contact.phone;
  const terms = [
    data.deliveryDays ? { label: "PRAZO", text: `${data.deliveryDays} dias após a aprovação e o recebimento dos materiais.` } : null,
    data.paymentTerms ? { label: "PAGAMENTO", text: data.paymentTerms } : null,
    data.validUntil ? { label: "VALIDADE", text: `Proposta válida até ${fmtDate(data.validUntil)}.` } : null,
  ].filter((t): t is { label: string; text: string } => Boolean(t));

  return (
    <Document title={`${data.number} — ${data.title}`} author={companyName} subject="Proposta comercial">
      <Page size="A4" style={s.page}>
        <View style={s.band} fixed>
          <View style={s.brand}>
            <Shield size={20} />
            <Text style={s.word}>
              GARD<Text style={s.wordLight}>SOFT</Text>
            </Text>
          </View>
          <View style={s.bandRight}>
            <Text style={s.bandSmall}>PROPOSTA COMERCIAL</Text>
            <Text style={s.bandNumber}>{data.number}</Text>
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.kicker}>ORÇAMENTO PARA {r.display.toUpperCase()}</Text>
          <Text style={s.title}>{data.title}</Text>
          <Text style={s.meta}>
            Emitido em {fmtDateTime(issuedAt)} por {issuer}
          </Text>

          {/* o essencial em uma linha: quanto, em quanto tempo e até quando */}
          <View style={s.summary} wrap={false}>
            <View style={[s.sumCell, s.sumFirst]}>
              <Text style={s.sumLabel}>INVESTIMENTO TOTAL</Text>
              <Text style={s.sumBig}>{money(data.totalCents)}</Text>
            </View>
            <View style={s.sumCell}>
              <Text style={s.sumLabel}>PRAZO DE ENTREGA</Text>
              <Text style={s.sumValue}>{data.deliveryDays ? `${data.deliveryDays} dias` : "A combinar"}</Text>
            </View>
            <View style={s.sumCell}>
              <Text style={s.sumLabel}>VÁLIDO ATÉ</Text>
              <Text style={s.sumValue}>{data.validUntil ? fmtDate(data.validUntil) : "Sem prazo"}</Text>
            </View>
          </View>

          <View style={s.parties} wrap={false}>
            <View style={s.party}>
              <Text style={s.label}>DE</Text>
              <Text style={s.partyName}>{companyName}</Text>
              {c.legalName && c.legalName !== companyName ? <Text>{c.legalName}</Text> : null}
              {c.document ? <Text>CNPJ {c.document}</Text> : null}
              {c.cityState ? <Text style={s.muted}>{c.cityState}</Text> : null}
              {email || phone ? <Text style={s.muted}>{join(email, phone)}</Text> : null}
              {c.website ? <Text style={s.muted}>{c.website}</Text> : null}
            </View>
            <View style={s.party}>
              <Text style={s.label}>PARA</Text>
              <Text style={s.partyName}>{r.display}</Text>
              {r.company ? <Text>A/C {r.name}</Text> : null}
              {r.document ? <Text>CPF/CNPJ {r.document}</Text> : null}
              {r.email || r.phone ? <Text style={s.muted}>{join(r.email, r.phone)}</Text> : null}
            </View>
          </View>

          {lines(data.intro).length > 0 ? (
            <View style={{ marginTop: 16 }}>
              {lines(data.intro).map((p, i) => (
                <Text key={i} style={s.para}>
                  {p}
                </Text>
              ))}
            </View>
          ) : null}

          <Text style={s.h2}>ESCOPO E INVESTIMENTO</Text>
          <View style={s.table}>
            <View style={[s.tr, { backgroundColor: SOFT, borderTopLeftRadius: 7, borderTopRightRadius: 7 }]} fixed>
              <Text style={[s.th, { width: 22 }]}>#</Text>
              <Text style={[s.th, { flex: 4 }]}>SERVIÇO</Text>
              <Text style={[s.th, { flex: 0.7, textAlign: "right" }]}>QTD.</Text>
              <Text style={[s.th, { flex: 1.4, textAlign: "right" }]}>UNITÁRIO</Text>
              <Text style={[s.th, { flex: 1.4, textAlign: "right" }]}>TOTAL</Text>
            </View>
            {data.items.map((item, i) => (
              <View key={i} style={i % 2 ? [s.tr, s.zebra] : s.tr} wrap={false}>
                <Text style={s.idx}>{String(i + 1).padStart(2, "0")}</Text>
                <View style={{ flex: 4, paddingRight: 8 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold" }}>{item.description}</Text>
                  {lines(item.details).map((d, j) => (
                    <Text key={j} style={[s.muted, { fontSize: 8.5 }]}>
                      {d}
                    </Text>
                  ))}
                </View>
                <Text style={{ flex: 0.7, textAlign: "right" }}>{String(item.quantity).replace(".", ",")}</Text>
                <Text style={{ flex: 1.4, textAlign: "right" }}>{money(item.unitCents)}</Text>
                <Text style={{ flex: 1.4, textAlign: "right", fontFamily: "Helvetica-Bold" }}>{money(itemTotal(item))}</Text>
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
                  <Text style={{ color: GREEN }}>- {money(data.discountCents)}</Text>
                </View>
              </>
            ) : null}
            <View style={s.total} wrap={false}>
              <Text style={s.totalText}>Valor total</Text>
              <Text style={[s.totalText, { fontSize: 13 }]}>{money(data.totalCents)}</Text>
            </View>
          </View>

          {terms.length > 0 ? (
            <>
              <Text style={s.h2}>CONDIÇÕES</Text>
              <View style={s.terms} wrap={false}>
                {terms.map((t, i) => (
                  <View key={t.label} style={i === terms.length - 1 ? [s.term, { borderBottomWidth: 0 }] : s.term}>
                    <Text style={s.termLabel}>{t.label}</Text>
                    <Text style={s.termText}>{t.text}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {lines(data.notes).length > 0 ? (
            <>
              <Text style={s.h2}>OBSERVAÇÕES</Text>
              {lines(data.notes).map((p, i) => (
                <Text key={i} style={s.para}>
                  {p}
                </Text>
              ))}
            </>
          ) : null}

          {data.decision ? (
            <View
              wrap={false}
              style={[
                s.decision,
                data.decision.status === "aprovado"
                  ? { backgroundColor: "#ECFDF3", borderColor: "#ABEFC6" }
                  : { backgroundColor: "#FEF3F2", borderColor: "#FECDCA" },
              ]}
            >
              <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, color: data.decision.status === "aprovado" ? GREEN : RED }}>
                {data.decision.status === "aprovado" ? "Proposta aprovada" : "Proposta recusada"}
              </Text>
              <Text>
                Por {data.decision.name} em {fmtDateTime(data.decision.at)}.
              </Text>
            </View>
          ) : (
            <View style={s.approve} wrap={false}>
              <View style={s.approveBox}>
                <Text style={s.approveTitle}>Aprove online em 1 minuto</Text>
                <View style={s.steps}>
                  {["Abra o link", "Confira a proposta", "Toque em Aprovar"].map((text, i) => (
                    <View key={i} style={s.step}>
                      <View style={s.stepDot}>
                        <Text style={s.stepNum}>{i + 1}</Text>
                      </View>
                      <Text>{text}</Text>
                    </View>
                  ))}
                </View>
                <Link src={approveUrl} style={s.link}>
                  {approveUrl}
                </Link>
              </View>
              <View style={s.signBox}>
                <Text style={s.label}>DE ACORDO</Text>
                <View style={s.signRow}>
                  <View style={{ flex: 2 }}>
                    <View style={s.signLine} />
                    <Text style={s.signLabel}>Assinatura do cliente</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={s.signLine} />
                    <Text style={s.signLabel}>Data</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={s.footerLine} fixed />
        <Text style={s.footerLeft} fixed>
          {join(c.legalName || companyName, c.document && `CNPJ ${c.document}`, email, phone)}
        </Text>
        <Text style={s.footerRight} fixed>
          {data.number}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderQuotePdf(props: Parameters<typeof QuoteDocument>[0]) {
  return renderToBuffer(<QuoteDocument {...props} />);
}
