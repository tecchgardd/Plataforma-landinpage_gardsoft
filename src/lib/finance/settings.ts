import "server-only";
import { z } from "zod";
import { prisma, Prisma } from "@/lib/prisma";

const KEY = "config:finance";
const str = (max = 200) => z.string().trim().max(max);

export const financeSettingsSchema = z.object({
  company: z.object({
    legalName: str(120),
    tradeName: str(80),
    document: str(20),
    address: str(200),
    cityState: str(80),
    email: str(120),
    phone: str(30),
    website: str(120),
    representative: str(80),
  }),
  contract: z.object({
    /** Cláusulas padrão. Variáveis: {contratante}, {contratada}, {valor}, {prazo}, {foro}. */
    clauses: str(20000),
    jurisdiction: str(80),
  }),
  billing: z.object({
    /** BOLETO, PIX ou UNDEFINED (o cliente escolhe na fatura) */
    method: z.enum(["UNDEFINED", "BOLETO", "PIX"]),
    finePercent: z.number().min(0).max(2),
    interestPercent: z.number().min(0).max(10),
    createOnSign: z.boolean(),
  }),
  invoice: z.object({
    autoIssue: z.boolean(),
    municipalServiceCode: str(30),
    municipalServiceName: str(200),
    description: str(500),
    issPercent: z.number().min(0).max(10),
    retainIss: z.boolean(),
  }),
});

export type FinanceSettings = z.infer<typeof financeSettingsSchema>;

export const defaultClauses = `CLÁUSULA 1 — DO OBJETO
1.1. O presente contrato tem por objeto a prestação, pela {contratada}, dos serviços de tecnologia descritos no Escopo do Projeto deste documento, para {contratante}.
1.2. Qualquer item não previsto no Escopo será tratado como alteração de escopo, sujeita a novo orçamento e aprovação por escrito.

CLÁUSULA 2 — DO PRAZO
2.1. O prazo estimado para a entrega é de {prazo}, contados a partir do recebimento do briefing completo, dos materiais (textos, imagens, acessos) e do primeiro pagamento.
2.2. Atrasos no envio de materiais ou nas aprovações pela CONTRATANTE prorrogam o prazo pelo mesmo período.

CLÁUSULA 3 — DO VALOR E DA FORMA DE PAGAMENTO
3.1. Pelos serviços, a CONTRATANTE pagará o valor total de {valor}, conforme o Plano de Pagamento deste documento.
3.2. Os pagamentos serão feitos por boleto bancário ou Pix, enviados ao e-mail da CONTRATANTE.
3.3. O atraso no pagamento sujeita a CONTRATANTE a multa e juros conforme indicado na cobrança, e autoriza a suspensão dos serviços até a regularização.

CLÁUSULA 4 — DAS ETAPAS E APROVAÇÕES
4.1. O projeto segue as etapas: briefing, protótipo, design, codificação e testes, briefing de entrega e publicação.
4.2. Cada etapa visual inclui até 2 (duas) rodadas de ajustes. Rodadas adicionais podem ser cobradas à parte.

CLÁUSULA 5 — DAS OBRIGAÇÕES DA CONTRATADA
5.1. Executar os serviços com qualidade técnica, seguindo boas práticas de desenvolvimento, segurança e responsividade.
5.2. Manter a CONTRATANTE informada sobre o andamento do projeto.

CLÁUSULA 6 — DAS OBRIGAÇÕES DA CONTRATANTE
6.1. Fornecer informações, materiais e acessos necessários nos prazos combinados.
6.2. Garantir que possui os direitos de uso dos materiais fornecidos (textos, imagens, marcas).

CLÁUSULA 7 — DA PROPRIEDADE INTELECTUAL
7.1. Após a quitação integral, a CONTRATANTE terá o direito de uso do projeto entregue. Bibliotecas, componentes e ferramentas de uso geral da CONTRATADA permanecem de sua titularidade.
7.2. A CONTRATADA poderá citar o projeto em seu portfólio, salvo pedido expresso em contrário.

CLÁUSULA 8 — DA CONFIDENCIALIDADE E PROTEÇÃO DE DADOS
8.1. As partes manterão sigilo sobre as informações trocadas e tratarão dados pessoais conforme a Lei nº 13.709/2018 (LGPD).

CLÁUSULA 9 — DA RESCISÃO
9.1. O contrato pode ser rescindido por qualquer das partes mediante aviso por escrito com 15 (quinze) dias de antecedência, sendo devidos os valores dos serviços já executados.

CLÁUSULA 10 — DA ASSINATURA ELETRÔNICA
10.1. As partes reconhecem a validade da assinatura eletrônica deste instrumento, nos termos da MP nº 2.200-2/2001 e da Lei nº 14.063/2020, com registro de data, hora, IP e código de verificação.

CLÁUSULA 11 — DO FORO
11.1. Fica eleito o foro da comarca de {foro} para dirimir quaisquer questões oriundas deste contrato.`;

export const defaultFinanceSettings: FinanceSettings = {
  company: {
    legalName: "Gardsoft",
    tradeName: "Gardsoft",
    document: "",
    address: "",
    cityState: "",
    email: "",
    phone: "",
    website: "",
    representative: "",
  },
  contract: { clauses: defaultClauses, jurisdiction: "" },
  billing: { method: "UNDEFINED", finePercent: 2, interestPercent: 1, createOnSign: true },
  invoice: {
    autoIssue: false,
    municipalServiceCode: "",
    municipalServiceName: "Desenvolvimento de programas de computador sob encomenda",
    description: "Serviços de desenvolvimento de software: {descricao}",
    issPercent: 2,
    retainIss: false,
  },
};

export async function getFinanceSettings(): Promise<FinanceSettings> {
  const row = await prisma.content.findUnique({ where: { key: KEY } });
  if (!row) return defaultFinanceSettings;
  // Mescla com o padrão para tolerar campos novos.
  const merged = { ...defaultFinanceSettings, ...(row.value as object) } as FinanceSettings;
  const parsed = financeSettingsSchema.safeParse(merged);
  return parsed.success ? parsed.data : defaultFinanceSettings;
}

export async function saveFinanceSettings(settings: FinanceSettings) {
  const value = settings as unknown as Prisma.InputJsonValue;
  await prisma.content.upsert({ where: { key: KEY }, create: { key: KEY, value }, update: { value } });
}
