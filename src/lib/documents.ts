import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

/** Seção de um documento: título + texto livre (parágrafos separados por linha em branco; "- " vira lista). */
export const sectionSchema = z.object({ title: z.string().trim().min(1).max(120), body: z.string().max(20000) });
export const sectionsSchema = z.array(sectionSchema).max(40);
export type DocSection = z.infer<typeof sectionSchema>;

type DocType = { value: string; label: string; short: string; description: string; sections: { title: string; hint: string }[] };

/** Tipos de documento e o modelo de seções de cada um (o texto de ajuda vira o placeholder). */
export const documentTypes: DocType[] = [
  {
    value: "tap",
    label: "Termo de abertura do projeto (TAP)",
    short: "Termo de abertura",
    description: "Oficializa o início: objetivo, entregas, prazos, responsáveis e o que fica de fora.",
    sections: [
      { title: "Objetivo do projeto", hint: "O que o projeto resolve para o cliente, em 2 ou 3 frases." },
      { title: "Justificativa", hint: "Por que o projeto existe: problema atual, oportunidade, resultado esperado." },
      { title: "Escopo resumido", hint: "- Site institucional com 5 páginas\n- Painel administrativo\n- Integração com WhatsApp" },
      { title: "Entregáveis", hint: "- Layout aprovado (Figma)\n- Site publicado em produção\n- Manual de uso" },
      { title: "Fora do escopo", hint: "O que NÃO está incluído (evita discussões depois): conteúdo, fotos, tráfego pago..." },
      { title: "Partes interessadas", hint: "- Cliente: nome, papel, contato\n- Gardsoft: gerente do projeto, desenvolvedor, designer" },
      { title: "Premissas e restrições", hint: "O cliente envia textos e imagens até dd/mm. Hospedagem por conta do cliente..." },
      { title: "Riscos", hint: "- Atraso no envio de conteúdo → prazo é estendido na mesma proporção" },
      { title: "Marcos e prazos", hint: "- Briefing: dd/mm\n- Layout: dd/mm\n- Desenvolvimento: dd/mm\n- Publicação: dd/mm" },
      { title: "Investimento", hint: "Valor total e condições (detalhes no contrato)." },
      { title: "Critérios de aceite", hint: "Como o projeto é considerado concluído." },
    ],
  },
  {
    value: "escopo",
    label: "Documento de escopo",
    short: "Escopo",
    description: "Detalha o que será construído: telas, funcionalidades, integrações e regras.",
    sections: [
      { title: "Visão geral", hint: "Resumo do sistema/site e de quem vai usar." },
      { title: "Perfis de usuário", hint: "- Visitante: ...\n- Administrador: ..." },
      { title: "Requisitos funcionais", hint: "- RF01 — O usuário pode ...\n- RF02 — O administrador pode ..." },
      { title: "Requisitos não funcionais", hint: "- Responsivo (celular, tablet, desktop)\n- Carregamento < 3s\n- LGPD" },
      { title: "Páginas e telas", hint: "- Home\n- Sobre\n- Serviços\n- Contato" },
      { title: "Integrações", hint: "- WhatsApp\n- Google Analytics\n- Gateway de pagamento" },
      { title: "Regras de negócio", hint: "- RN01 — ..." },
      { title: "Fora do escopo", hint: "O que fica para uma próxima fase." },
      { title: "Critérios de aceite", hint: "Como cada entrega será validada." },
    ],
  },
  {
    value: "tecnico",
    label: "Especificação técnica",
    short: "Especificação técnica",
    description: "Arquitetura, tecnologias, ambientes, segurança e hospedagem.",
    sections: [
      { title: "Arquitetura", hint: "Front-end, back-end, banco de dados, serviços externos." },
      { title: "Tecnologias", hint: "- Next.js\n- PostgreSQL (Neon)\n- Vercel" },
      { title: "Ambientes", hint: "- Desenvolvimento\n- Homologação (preview)\n- Produção" },
      { title: "Segurança e LGPD", hint: "Autenticação, senhas, backups, dados pessoais." },
      { title: "Hospedagem e domínio", hint: "Onde fica, quem paga, renovação." },
      { title: "Repositório e versionamento", hint: "GitHub, branches, deploy automático." },
      { title: "Manutenção e suporte", hint: "SLA, horários, canais." },
    ],
  },
  {
    value: "mer",
    label: "Modelo de dados (MER)",
    short: "MER",
    description: "Entidades, relacionamentos e dicionário de dados. Anexe o diagrama.",
    sections: [
      { title: "Visão geral do modelo", hint: "Quais dados o sistema guarda e para quê." },
      { title: "Entidades", hint: "- Cliente: id, nome, e-mail, telefone\n- Pedido: id, cliente_id, total, status" },
      { title: "Relacionamentos", hint: "- Cliente 1:N Pedido\n- Pedido N:N Produto (via ItemPedido)" },
      { title: "Dicionário de dados", hint: "Campo — tipo — obrigatório — descrição" },
      { title: "Diagrama", hint: "O diagrama vai em anexo (imagem ou PDF)." },
      { title: "Observações", hint: "Índices, regras de exclusão, histórico." },
    ],
  },
  {
    value: "layout",
    label: "Aprovação de layout",
    short: "Aprovação de layout",
    description: "Apresenta as telas para o cliente aprovar antes da programação.",
    sections: [
      { title: "O que está sendo apresentado", hint: "Telas desktop e celular da Home, Sobre e Contato." },
      { title: "Protótipo", hint: "Link do Figma: https://figma.com/..." },
      { title: "Pontos de atenção", hint: "Cores, fontes, imagens provisórias, textos de exemplo." },
      { title: "Depois da aprovação", hint: "Com o layout aprovado, mudanças visuais grandes viram ajuste extra." },
    ],
  },
  {
    value: "ata",
    label: "Ata de reunião / discussão de escopo",
    short: "Ata de reunião",
    description: "Registra o que foi decidido em uma reunião com o cliente.",
    sections: [
      { title: "Data e participantes", hint: "dd/mm/aaaa — fulano (cliente), ciclano (Gardsoft)" },
      { title: "Pauta", hint: "- Revisão do layout\n- Prazo da publicação" },
      { title: "Decisões", hint: "- Ficou definido que ..." },
      { title: "Pendências", hint: "- Cliente envia logo em alta até dd/mm" },
      { title: "Próximos passos", hint: "- Gardsoft entrega a versão 2 até dd/mm" },
    ],
  },
  {
    value: "entrega",
    label: "Termo de entrega e aceite",
    short: "Termo de entrega",
    description: "Formaliza a entrega final e o aceite do cliente.",
    sections: [
      { title: "Entregáveis", hint: "- Site publicado em https://...\n- Painel administrativo" },
      { title: "Acessos entregues", hint: "- Painel: usuário do cliente\n- Hospedagem e domínio" },
      { title: "Garantia", hint: "Correções de erros por 90 dias a partir do aceite." },
      { title: "Aceite", hint: "Ao aprovar, o cliente confirma o recebimento do projeto conforme o escopo." },
    ],
  },
  {
    value: "outro",
    label: "Outro documento",
    short: "Documento",
    description: "Documento livre: monte as seções que precisar.",
    sections: [{ title: "Conteúdo", hint: "" }],
  },
];

export const documentStatuses = [
  { value: "rascunho", label: "Rascunho" },
  { value: "enviado", label: "Enviado" },
  { value: "visualizado", label: "Visualizado" },
  { value: "aprovado", label: "Aprovado" },
  { value: "ajustes", label: "Ajustes pedidos" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export const eventLabels: Record<string, string> = {
  criado: "Criou o documento",
  editado: "Editou o conteúdo",
  enviado: "Enviou para o cliente",
  visualizado: "Cliente abriu o link",
  aprovado: "Cliente aprovou",
  ajustes: "Cliente pediu ajustes",
  versao: "Nova versão",
  aprovado_manual: "Aprovação registrada pela equipe",
  cancelado: "Cancelou",
};

export const typeOf = (value: string) => documentTypes.find((t) => t.value === value) ?? documentTypes.at(-1)!;

export const newDocumentToken = () => randomBytes(24).toString("base64url");

/** Modelo inicial de seções do tipo escolhido (corpo vazio; a ajuda aparece como placeholder). */
export const templateSections = (type: string): DocSection[] => typeOf(type).sections.map((s) => ({ title: s.title, body: "" }));

/** Hash do conteúdo exatamente como o cliente leu (título, versão e seções). */
export function documentHash(doc: { number: string; title: string; version: number; sections: DocSection[] }) {
  const text = [doc.number, doc.title, `v${doc.version}`, ...doc.sections.flatMap((s) => [s.title, s.body.trim()])].join("\n");
  return createHash("sha256").update(text).digest("hex");
}

/** Divide o texto em blocos: parágrafos e listas ("- " ou "• " no começo da linha). */
export function textBlocks(body: string) {
  return body
    .trim()
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((block) => {
      const lines = block.split("\n");
      if (lines.every((l) => /^\s*[-•*]\s+/.test(l))) return { list: lines.map((l) => l.replace(/^\s*[-•*]\s+/, "")) };
      return { text: block };
    });
}
