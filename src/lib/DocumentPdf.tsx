import "server-only";
import { Document, Image, Page, Path, StyleSheet, Svg, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { textBlocks, typeOf, type DocSection } from "./documents";

const BLUE = "#1A5CFF";
const INK = "#0A1430";
const MUTED = "#6A7593";
const LINE = "#E3E9F5";
const SOFT = "#F5F8FF";

const s = StyleSheet.create({
  page: { paddingTop: 96, paddingBottom: 64, fontFamily: "Helvetica", fontSize: 10, color: INK, lineHeight: 1.5 },
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
  kind: { fontFamily: "Helvetica-Bold", fontSize: 8.5, color: BLUE, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 },
  title: { fontFamily: "Helvetica-Bold", fontSize: 18, lineHeight: 1.25, marginBottom: 10 },
  meta: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 18 },
  metaItem: { backgroundColor: SOFT, borderWidth: 1, borderColor: LINE, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10 },
  metaLabel: { fontSize: 7.5, color: MUTED },
  metaValue: { fontFamily: "Helvetica-Bold", fontSize: 9.5 },
  h2: { fontFamily: "Helvetica-Bold", fontSize: 11.5, color: INK, marginTop: 14, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: LINE },
  p: { marginBottom: 6, textAlign: "justify" },
  li: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 12, color: BLUE },
  liText: { flex: 1 },
  empty: { color: MUTED, fontStyle: "italic" },
  figure: { marginTop: 10, borderWidth: 1, borderColor: LINE, borderRadius: 6, padding: 8 },
  figureImg: { maxHeight: 360, objectFit: "contain" },
  caption: { fontSize: 8, color: MUTED, marginTop: 4 },
  approval: { marginTop: 20, padding: 12, borderRadius: 6, borderWidth: 1, borderColor: LINE, backgroundColor: SOFT },
  approvalTitle: { fontFamily: "Helvetica-Bold", marginBottom: 4 },
  muted: { color: MUTED },
  footerLine: { position: "absolute", bottom: 40, left: 40, right: 40, borderTopWidth: 1, borderTopColor: LINE },
  footerLeft: { position: "absolute", bottom: 24, left: 40, fontSize: 7.5, color: MUTED },
});

function Shield({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 1.12} viewBox="0 0 100 112">
      <Path d="M86 28 50 12 14 28v28c0 23 15 39 36 47 21-8 36-24 36-47V46H47v10l13 7" stroke="#FFFFFF" strokeWidth={13} fill="none" />
    </Svg>
  );
}

const fmt = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });

export type DocumentPdfInput = {
  number: string;
  type: string;
  title: string;
  version: number;
  status: string;
  clientName: string | null;
  projectName: string | null;
  author: string | null;
  updatedAt: Date;
  sections: DocSection[];
  images: { label: string; src: string }[];
  approval: { name: string; email: string; at: Date; ip: string; hash: string } | null;
};

function DocumentFile(d: DocumentPdfInput) {
  const kind = typeOf(d.type);
  return (
    <Document title={`${d.number} — ${d.title}`} author="Gardsoft" subject={kind.label}>
      <Page size="A4" style={s.page}>
        <View style={s.band} fixed>
          <View style={s.brand}>
            <Shield />
            <Text style={s.word}>
              GARD<Text style={s.wordLight}>SOFT</Text>
            </Text>
          </View>
          <View style={s.bandRight}>
            <Text style={s.bandSmall}>{kind.short}</Text>
            <Text style={s.bandNumber}>
              {d.number} · v{d.version}
            </Text>
          </View>
        </View>

        <View style={s.body}>
          <Text style={s.kind}>{kind.label}</Text>
          <Text style={s.title}>{d.title}</Text>
          <View style={s.meta}>
            {d.clientName ? (
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>Cliente</Text>
                <Text style={s.metaValue}>{d.clientName}</Text>
              </View>
            ) : null}
            {d.projectName ? (
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>Projeto</Text>
                <Text style={s.metaValue}>{d.projectName}</Text>
              </View>
            ) : null}
            <View style={s.metaItem}>
              <Text style={s.metaLabel}>Versão</Text>
              <Text style={s.metaValue}>
                {d.version} · {fmt(d.updatedAt)}
              </Text>
            </View>
            {d.author ? (
              <View style={s.metaItem}>
                <Text style={s.metaLabel}>Responsável</Text>
                <Text style={s.metaValue}>{d.author}</Text>
              </View>
            ) : null}
          </View>

          {d.sections.map((section, i) => (
            <View key={i}>
              <Text style={s.h2} minPresenceAhead={40}>
                {i + 1}. {section.title}
              </Text>
              {section.body.trim() ? (
                textBlocks(section.body).map((block, j) =>
                  "list" in block ? (
                    <View key={j}>
                      {block.list!.map((item, k) => (
                        <View key={k} style={s.li} wrap={false}>
                          <Text style={s.bullet}>•</Text>
                          <Text style={s.liText}>{item}</Text>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <Text key={j} style={s.p}>
                      {block.text}
                    </Text>
                  ),
                )
              ) : (
                <Text style={s.empty}>Não se aplica.</Text>
              )}
            </View>
          ))}

          {d.images.length > 0 && (
            <View>
              <Text style={s.h2}>Anexos</Text>
              {d.images.map((img, i) => (
                <View key={i} style={s.figure} wrap={false}>
                  <Image src={img.src} style={s.figureImg} />
                  <Text style={s.caption}>
                    Figura {i + 1} — {img.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={s.approval} wrap={false}>
            {d.approval ? (
              <>
                <Text style={s.approvalTitle}>Aprovado eletronicamente pelo cliente</Text>
                <Text>
                  {d.approval.name} ({d.approval.email}) em {fmt(d.approval.at)} · IP {d.approval.ip}
                </Text>
                <Text style={s.muted}>Hash SHA-256 do conteúdo aprovado: {d.approval.hash}</Text>
              </>
            ) : (
              <>
                <Text style={s.approvalTitle}>Aguardando aprovação do cliente</Text>
                <Text style={s.muted}>A aprovação é feita pelo link enviado pela Gardsoft e fica registrada com data, hora e IP.</Text>
              </>
            )}
          </View>
        </View>

        <View style={s.footerLine} fixed />
        <Text style={s.footerLeft} fixed>
          {d.number} · v{d.version} · Gardsoft — Tecnologia que impulsiona negócios
        </Text>
      </Page>
    </Document>
  );
}

export async function renderDocumentPdf(input: DocumentPdfInput) {
  return renderToBuffer(<DocumentFile {...input} />);
}
