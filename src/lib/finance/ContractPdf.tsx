import "server-only";
import { Document, Image, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { FinanceSettings } from "./settings";
import { money, partyName, renderClauses, verificationCode, type ContractData } from "./contract";

const BLUE = "#1A5CFF";
const INK = "#0A1430";
const MUTED = "#6A7593";
const LINE = "#E3E9F5";
const SOFT = "#F5F8FF";

const s = StyleSheet.create({
  page: { paddingTop: 0, paddingBottom: 64, paddingHorizontal: 0, fontFamily: "Helvetica", fontSize: 9.5, color: INK, lineHeight: 1.45 },
  band: { backgroundColor: BLUE, paddingVertical: 22, paddingHorizontal: 40, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  brand: { flexDirection: "row", alignItems: "center" },
  word: { fontFamily: "Helvetica-Bold", fontSize: 16, color: "#FFFFFF", letterSpacing: 1.2, marginLeft: 8 },
  wordLight: { fontFamily: "Helvetica", color: "#CFE6FF" },
  bandRight: { alignItems: "flex-end" },
  bandSmall: { color: "#CFE6FF", fontSize: 8 },
  bandNumber: { color: "#FFFFFF", fontFamily: "Helvetica-Bold", fontSize: 11 },
  body: { paddingHorizontal: 40, paddingTop: 22 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 17, marginBottom: 2 },
  subtitle: { color: MUTED, marginBottom: 16 },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 10.5, color: BLUE, textTransform: "uppercase", letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },
  parties: { flexDirection: "row", gap: 12 },
  party: { flex: 1, backgroundColor: SOFT, borderRadius: 6, padding: 12, borderWidth: 1, borderColor: LINE },
  partyLabel: { fontFamily: "Helvetica-Bold", fontSize: 8, color: BLUE, letterSpacing: 0.8, marginBottom: 4 },
  partyName: { fontFamily: "Helvetica-Bold", fontSize: 10.5, marginBottom: 3 },
  muted: { color: MUTED },
  box: { borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 12 },
  table: { borderWidth: 1, borderColor: LINE, borderRadius: 6 },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: LINE, paddingVertical: 6, paddingHorizontal: 10 },
  th: { fontFamily: "Helvetica-Bold", color: MUTED, fontSize: 8.5 },
  total: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 8, paddingHorizontal: 10, backgroundColor: SOFT },
  clause: { marginBottom: 5, textAlign: "justify" },
  clauseTitle: { fontFamily: "Helvetica-Bold", marginTop: 8, marginBottom: 3 },
  signs: { flexDirection: "row", gap: 16, marginTop: 10 },
  sign: { flex: 1, borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 12, minHeight: 120 },
  signImage: { height: 48, objectFit: "contain", marginVertical: 6 },
  signLine: { borderTopWidth: 1, borderTopColor: INK, marginTop: 8, paddingTop: 4 },
  pending: { marginVertical: 18, color: MUTED, textAlign: "center" },
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, flexDirection: "row", justifyContent: "space-between", fontSize: 7.5, color: MUTED, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8 },
});

function Shield({ size = 22, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size * 1.12} viewBox="0 0 100 112">
      <Path d="M86 28 50 12 14 28v28c0 23 15 39 36 47 21-8 36-24 36-47V46H47v10l13 7" stroke={color} strokeWidth={13} fill="none" />
    </Svg>
  );
}

const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");
const fmtDateTime = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export type Signature = {
  signedAt: Date;
  name: string;
  document: string;
  email: string;
  ip: string;
  image: string;
  hash: string;
};

function ContractDocument({
  data,
  settings,
  issuer,
  issuedAt,
  signature,
  verifyUrl,
}: {
  data: ContractData;
  settings: FinanceSettings;
  issuer: string;
  issuedAt: Date;
  signature: Signature | null;
  verifyUrl: string;
}) {
  const c = settings.company;
  const client = data.client;
  const clauses = renderClauses(data, settings).split(/\n+/).filter(Boolean);
  const code = signature ? verificationCode(signature.hash) : "Aguardando assinatura";

  return (
    <Document title={`${data.number} — ${data.title}`} author="Gardsoft" subject="Contrato de prestação de serviços">
      <Page size="A4" style={s.page}>
        <View style={s.band} fixed>
          <View style={s.brand}>
            <Shield />
            <Text style={s.word}>
              GARD<Text style={s.wordLight}>SOFT</Text>
            </Text>
          </View>
          <View style={s.bandRight}>
            <Text style={s.bandSmall}>Contrato de prestação de serviços</Text>
            <Text style={s.bandNumber}>{data.number}</Text>
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.title}>{data.title}</Text>
          <Text style={s.subtitle}>
            Emitido em {fmtDateTime(issuedAt)} por {issuer}
          </Text>

          <View style={s.parties}>
            <View style={s.party}>
              <Text style={s.partyLabel}>CONTRATADA</Text>
              <Text style={s.partyName}>{c.legalName || "Gardsoft"}</Text>
              {c.document ? <Text>CNPJ: {c.document}</Text> : null}
              {c.address ? <Text style={s.muted}>{c.address}</Text> : null}
              {c.cityState ? <Text style={s.muted}>{c.cityState}</Text> : null}
              {c.email || c.phone ? <Text style={s.muted}>{[c.email, c.phone].filter(Boolean).join(" · ")}</Text> : null}
            </View>
            <View style={s.party}>
              <Text style={s.partyLabel}>CONTRATANTE</Text>
              <Text style={s.partyName}>{partyName(client)}</Text>
              {client.company ? <Text>Responsável: {client.name}</Text> : null}
              {client.document ? <Text>CPF/CNPJ: {client.document}</Text> : null}
              {client.stateRegistration ? <Text>Inscrição estadual: {client.stateRegistration}</Text> : null}
              {client.address ? <Text style={s.muted}>{client.address}</Text> : null}
              {client.city ? (
                <Text style={s.muted}>
                  {client.city}
                  {client.state ? `/${client.state}` : ""}
                  {client.zipCode ? ` · CEP ${client.zipCode}` : ""}
                </Text>
              ) : null}
              {client.email || client.phone ? <Text style={s.muted}>{[client.email, client.phone].filter(Boolean).join(" · ")}</Text> : null}
            </View>
          </View>

          <Text style={s.h2}>Escopo do projeto</Text>
          <View style={s.box}>
            {data.scope.split(/\n+/).map((p, i) => (
              <Text key={i} style={s.clause}>
                {p}
              </Text>
            ))}
            {data.deliveryDays ? <Text style={s.muted}>Prazo estimado de entrega: {data.deliveryDays} dias.</Text> : null}
          </View>

          <Text style={s.h2}>Valor e plano de pagamento</Text>
          <View style={s.table}>
            <View style={s.tr}>
              <Text style={[s.th, { flex: 2 }]}>Parcela</Text>
              <Text style={[s.th, { flex: 1 }]}>Vencimento</Text>
              <Text style={[s.th, { flex: 1, textAlign: "right" }]}>Valor</Text>
            </View>
            {data.paymentPlan.map((p, i) => (
              <View key={i} style={s.tr} wrap={false}>
                <Text style={{ flex: 2 }}>{p.label}</Text>
                <Text style={{ flex: 1 }}>{fmtDate(p.dueDate)}</Text>
                <Text style={{ flex: 1, textAlign: "right" }}>{money(p.amountCents)}</Text>
              </View>
            ))}
            <View style={s.total}>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>Valor total</Text>
              <Text style={{ fontFamily: "Helvetica-Bold" }}>{money(data.valueCents)}</Text>
            </View>
          </View>

          <Text style={s.h2}>Cláusulas</Text>
          {clauses.map((line, i) =>
            /^CLÁUSULA/i.test(line) ? (
              <Text key={i} style={s.clauseTitle} minPresenceAhead={30}>
                {line}
              </Text>
            ) : (
              <Text key={i} style={s.clause}>
                {line}
              </Text>
            ),
          )}

          <View wrap={false}>
            <Text style={s.h2}>Assinaturas</Text>
            <View style={s.signs}>
              <View style={s.sign}>
                <Text style={s.partyLabel}>CONTRATADA</Text>
                <Text style={{ fontFamily: "Helvetica-Bold", marginTop: 26 }}>{c.representative || issuer}</Text>
                <View style={s.signLine}>
                  <Text>{c.legalName || "Gardsoft"}</Text>
                  <Text style={s.muted}>Emitido e assinado eletronicamente em {fmtDateTime(issuedAt)}</Text>
                </View>
              </View>
              <View style={s.sign}>
                <Text style={s.partyLabel}>CONTRATANTE</Text>
                {signature ? (
                  <>
                    <Image src={signature.image} style={s.signImage} />
                    <View style={s.signLine}>
                      <Text style={{ fontFamily: "Helvetica-Bold" }}>{signature.name}</Text>
                      <Text>CPF/CNPJ: {signature.document}</Text>
                      <Text style={s.muted}>
                        Assinado em {fmtDateTime(signature.signedAt)} · IP {signature.ip}
                      </Text>
                      <Text style={s.muted}>{signature.email}</Text>
                    </View>
                  </>
                ) : (
                  <Text style={s.pending}>Aguardando assinatura eletrônica</Text>
                )}
              </View>
            </View>
            {signature ? (
              <View style={[s.box, { marginTop: 12, backgroundColor: SOFT }]}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>Código de verificação: {code}</Text>
                <Text style={s.muted}>Hash SHA-256 do conteúdo assinado: {signature.hash}</Text>
                <Text style={s.muted}>Verifique a autenticidade em {verifyUrl}</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={s.footer} fixed>
          <Text>
            {data.number} · {code}
          </Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function renderContractPdf(props: Parameters<typeof ContractDocument>[0]) {
  return renderToBuffer(<ContractDocument {...props} />);
}
