import type { ContentKey } from "@/lib/content-schema";

/** Descrição dos campos de cada seção, usada pelo editor genérico. */
export type FieldSpec =
  | { type: "text" | "textarea" | "tags" | "image" | "checkbox"; key: string; label: string; hint?: string }
  | { type: "select"; key: string; label: string; options: { value: string; label: string }[]; hint?: string }
  | {
      type: "list";
      key: string;
      label: string;
      itemLabel: string;
      titleKey: string;
      item: FieldSpec[];
      empty: Record<string, unknown>;
      hint?: string;
    };

export type SectionSpec = {
  key: ContentKey;
  title: string;
  description: string;
  /** Âncora da seção na landing, para o botão "ver no site". */
  anchor?: string;
  fields: FieldSpec[];
};

/** Etiqueta + título com trecho em destaque + texto de apoio, comum a quase todas as seções. */
const heading: FieldSpec[] = [
  { type: "text", key: "eyebrow", label: "Etiqueta", hint: "Texto pequeno acima do título" },
  { type: "text", key: "title", label: "Título" },
  { type: "text", key: "highlight", label: "Trecho em destaque", hint: "Aparece em azul, logo depois do título" },
  { type: "textarea", key: "text", label: "Texto de apoio" },
];

/** Seções na ordem em que aparecem na landing page. */
export const sections: SectionSpec[] = [
  {
    key: "hero",
    title: "Topo (hero)",
    description: "Primeira dobra: título principal, palavras animadas e botões.",
    anchor: "inicio",
    fields: [
      { type: "text", key: "badge", label: "Selo acima do título" },
      { type: "text", key: "line1", label: "Título — linha 1" },
      { type: "text", key: "line2", label: "Título — linha 2" },
      { type: "text", key: "highlight", label: "Título — linha em destaque" },
      { type: "text", key: "typedPrefix", label: "Prefixo do texto animado", hint: "Ex.: > criamos" },
      { type: "tags", key: "typedWords", label: "Palavras que se alternam", hint: "Separe por vírgula" },
      { type: "textarea", key: "lead", label: "Texto de apoio" },
      { type: "text", key: "primaryCta", label: "Botão principal" },
      { type: "text", key: "secondaryCta", label: "Botão secundário", hint: "Leva até os cases" },
      { type: "tags", key: "pillars", label: "Destaques com ✓", hint: "Separe por vírgula (até 4)" },
    ],
  },
  {
    key: "marquee",
    title: "Faixa animada",
    description: "Faixa azul inclinada que passa logo abaixo do topo.",
    fields: [{ type: "tags", key: "items", label: "Itens da faixa", hint: "Separe por vírgula" }],
  },
  {
    key: "services",
    title: "Serviços",
    description: "O que fazemos: cabeçalho e cards de serviço.",
    anchor: "servicos",
    fields: [
      ...heading,
      {
        type: "list",
        key: "items",
        label: "Serviços",
        itemLabel: "serviço",
        titleKey: "title",
        empty: { icon: "landing", tag: "", title: "Novo serviço", description: "", features: [], contact: "" },
        item: [
          { type: "text", key: "title", label: "Título" },
          { type: "text", key: "tag", label: "Etiqueta", hint: "Palavra curta acima do título" },
          { type: "textarea", key: "description", label: "Descrição" },
          { type: "tags", key: "features", label: "Destaques", hint: "Separe por vírgula" },
          {
            type: "select",
            key: "icon",
            label: "Ícone",
            options: [
              { value: "landing", label: "Página" },
              { value: "site", label: "Globo" },
              { value: "system", label: "Painel" },
              { value: "automation", label: "Raio" },
            ],
          },
          { type: "text", key: "contact", label: "Opção no formulário de contato", hint: "Ex.: Landing page" },
        ],
      },
    ],
  },
  {
    key: "story",
    title: "Nossa história",
    description: "Como surgiu a Gardsoft: citação, linha do tempo e valores.",
    anchor: "historia",
    fields: [
      ...heading,
      { type: "textarea", key: "quote", label: "Citação em destaque" },
      { type: "text", key: "quoteAuthor", label: "Autor da citação" },
      {
        type: "list",
        key: "chapters",
        label: "Linha do tempo",
        itemLabel: "capítulo",
        titleKey: "title",
        empty: { label: "", title: "Novo capítulo", text: "" },
        item: [
          { type: "text", key: "label", label: "Marcador", hint: "Ex.: O começo, 2023, Hoje" },
          { type: "text", key: "title", label: "Título" },
          { type: "textarea", key: "text", label: "Texto" },
        ],
      },
      {
        type: "list",
        key: "values",
        label: "Valores",
        itemLabel: "valor",
        titleKey: "title",
        empty: { title: "Novo valor", text: "" },
        item: [
          { type: "text", key: "title", label: "Valor" },
          { type: "text", key: "text", label: "Descrição" },
        ],
      },
    ],
  },
  {
    key: "cases",
    title: "Cases de sucesso",
    description: "Vitrine de projetos com foto, link e descrição.",
    anchor: "cases",
    fields: [
      ...heading,
      {
        type: "list",
        key: "items",
        label: "Cases",
        itemLabel: "case",
        titleKey: "name",
        empty: {
          name: "Novo case",
          type: "Landing page",
          segment: "",
          url: "",
          theme: "sea",
          kicker: "",
          headline: "",
          summary: "",
          tags: [],
          image: "",
          published: false,
        },
        item: [
          { type: "checkbox", key: "published", label: "Publicado no site" },
          { type: "text", key: "name", label: "Nome do cliente / projeto" },
          { type: "text", key: "url", label: "Link do projeto", hint: "Endereço completo, com https://" },
          { type: "text", key: "type", label: "Tipo", hint: "Ex.: Landing page, Site institucional, Sistema" },
          { type: "text", key: "segment", label: "Segmento" },
          { type: "textarea", key: "summary", label: "Resumo do projeto" },
          { type: "tags", key: "tags", label: "Etiquetas", hint: "Separe por vírgula" },
          {
            type: "image",
            key: "image",
            label: "Foto / print do projeto",
            hint: "Imagem horizontal (ideal 1600×1000). Sem foto, o site mostra uma ilustração com as cores do tema.",
          },
          {
            type: "select",
            key: "theme",
            label: "Tema da ilustração",
            options: [
              { value: "sea", label: "Oceano (azul-petróleo)" },
              { value: "glass", label: "Vidro (cinza-azulado)" },
              { value: "music", label: "Palco (laranja)" },
            ],
          },
          { type: "text", key: "kicker", label: "Chamada pequena da ilustração" },
          { type: "text", key: "headline", label: "Título da ilustração" },
        ],
      },
      { type: "text", key: "nextTitle", label: "Card final — título", hint: "O card “o próximo case pode ser o seu”" },
      { type: "text", key: "nextText", label: "Card final — texto" },
      { type: "text", key: "nextCta", label: "Card final — botão" },
    ],
  },
  {
    key: "banners",
    title: "Banners de chamada",
    description: "O banner azul após os cases e os dois banners após o processo.",
    fields: [
      { type: "text", key: "ideaKicker", label: "Banner azul — etiqueta" },
      { type: "text", key: "ideaTitle", label: "Banner azul — título" },
      { type: "textarea", key: "ideaText", label: "Banner azul — texto" },
      { type: "text", key: "ideaCta", label: "Banner azul — botão" },
      { type: "text", key: "leftKicker", label: "Banner claro — etiqueta" },
      { type: "text", key: "leftTitle", label: "Banner claro — título" },
      { type: "textarea", key: "leftText", label: "Banner claro — texto" },
      { type: "text", key: "leftCta", label: "Banner claro — botão" },
      { type: "text", key: "rightKicker", label: "Banner escuro — etiqueta" },
      { type: "text", key: "rightTitle", label: "Banner escuro — título" },
      { type: "textarea", key: "rightText", label: "Banner escuro — texto" },
      { type: "text", key: "rightCta", label: "Banner escuro — botão", hint: "Com WhatsApp configurado, vira “Chamar no WhatsApp”" },
    ],
  },
  {
    key: "process",
    title: "Processo",
    description: "Como funciona: as etapas do briefing ao projeto no ar.",
    anchor: "processo",
    fields: [
      ...heading,
      {
        type: "list",
        key: "items",
        label: "Etapas",
        itemLabel: "etapa",
        titleKey: "title",
        empty: { title: "Nova etapa", text: "", detail: "" },
        item: [
          { type: "text", key: "title", label: "Título" },
          { type: "text", key: "detail", label: "Detalhe curto", hint: "Ex.: Conversa + diagnóstico" },
          { type: "textarea", key: "text", label: "Descrição" },
        ],
      },
      { type: "text", key: "ctaText", label: "Chamada abaixo das etapas" },
      { type: "text", key: "ctaButton", label: "Botão da chamada" },
    ],
  },
  {
    key: "testimonials",
    title: "Avaliações",
    description: "Depoimentos de clientes em carrossel.",
    anchor: "avaliacoes",
    fields: [
      ...heading,
      {
        type: "list",
        key: "items",
        label: "Depoimentos",
        itemLabel: "depoimento",
        titleKey: "name",
        empty: { text: "", name: "", role: "" },
        item: [
          { type: "text", key: "name", label: "Nome do cliente" },
          { type: "text", key: "role", label: "Cargo · segmento" },
          { type: "textarea", key: "text", label: "Depoimento" },
        ],
      },
    ],
  },
  {
    key: "faq",
    title: "Perguntas frequentes",
    description: "Dúvidas comuns antes de começar um projeto.",
    fields: [
      ...heading,
      {
        type: "list",
        key: "items",
        label: "Perguntas",
        itemLabel: "pergunta",
        titleKey: "q",
        empty: { q: "Nova pergunta", a: "" },
        item: [
          { type: "text", key: "q", label: "Pergunta" },
          { type: "textarea", key: "a", label: "Resposta" },
        ],
      },
    ],
  },
  {
    key: "finalCta",
    title: "Chamada final",
    description: "Bloco azul de fechamento, antes do rodapé.",
    anchor: "contato",
    fields: [
      { type: "text", key: "badge", label: "Selo" },
      { type: "text", key: "title", label: "Título" },
      { type: "text", key: "highlight", label: "Trecho em destaque" },
      { type: "textarea", key: "text", label: "Texto" },
      { type: "text", key: "primaryCta", label: "Botão principal" },
      { type: "text", key: "secondaryCta", label: "Botão secundário", hint: "Leva até o processo" },
    ],
  },
  {
    key: "footer",
    title: "Rodapé",
    description: "Textos do rodapé. Os links de redes ficam em “Contatos e redes”.",
    fields: [
      { type: "textarea", key: "description", label: "Descrição abaixo da logo" },
      { type: "text", key: "contactText", label: "Texto da coluna de contato" },
      { type: "text", key: "bottomText", label: "Frase da barra inferior" },
    ],
  },
  {
    key: "site",
    title: "Contatos e redes",
    description: "WhatsApp, e-mail e redes sociais usados em todo o site.",
    fields: [
      { type: "text", key: "whatsapp", label: "WhatsApp", hint: "Somente números, com país e DDD. Ex.: 5551999999999" },
      { type: "text", key: "email", label: "E-mail de contato" },
      { type: "text", key: "instagram", label: "Instagram (link completo)" },
      { type: "text", key: "facebook", label: "Facebook (link completo)" },
      { type: "text", key: "linkedin", label: "LinkedIn (link completo)" },
      { type: "text", key: "tiktok", label: "TikTok (link completo)" },
      { type: "text", key: "youtube", label: "YouTube (link completo)" },
    ],
  },
];
