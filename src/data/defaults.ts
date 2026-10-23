import type { SiteContent } from "@/lib/content-schema";

/**
 * Conteúdo padrão do site, na ordem das seções da landing page.
 * É usado enquanto a seção ainda não foi salva pelo portal (/admin/conteudo).
 */

const hero: SiteContent["hero"] = {
  badge: "Estúdio de tecnologia · Sites, sistemas e automações",
  line1: "Tecnologia que",
  line2: "impulsiona",
  highlight: "negócios.",
  typedPrefix: "> criamos",
  typedWords: ["sites", "landing pages", "sistemas", "automações"],
  lead: "A gente tira sua ideia do papel e transforma em tecnologia sob medida: rápida, bonita e pronta para trazer novos clientes para o seu negócio.",
  primaryCta: "Quero tirar minha ideia do papel",
  secondaryCta: "Ver cases de sucesso",
  pillars: ["Design exclusivo", "Código moderno", "Atendimento direto"],
};

const marquee: SiteContent["marquee"] = {
  items: [
    "Landing pages",
    "Sites institucionais",
    "Sistemas web",
    "Automações",
    "Painéis administrativos",
    "Integrações",
    "Design de interfaces",
    "Performance",
  ],
};

const services: SiteContent["services"] = {
  eyebrow: "01 · O que fazemos",
  title: "Soluções digitais que",
  highlight: "trabalham pelo seu negócio.",
  text: "Do primeiro clique ao contato fechado: criamos a tecnologia certa para o momento da sua empresa — com design próprio, código moderno e foco em resultado.",
  items: [
    {
      icon: "landing",
      tag: "Conversão",
      title: "Landing pages",
      description:
        "Uma página com um único objetivo: transformar visitantes em contatos. Ideal para campanhas, lançamentos e para vender um serviço específico.",
      features: ["Foco em uma ação", "Rápida e responsiva", "Pronta para anúncios"],
      contact: "Landing page",
    },
    {
      icon: "site",
      tag: "Presença",
      title: "Sites institucionais",
      description:
        "Sua empresa apresentada com a identidade que ela merece: história, serviços, diferenciais e um caminho fácil até o seu contato.",
      features: ["Identidade da marca", "Otimizado para o Google", "Fácil de evoluir"],
      contact: "Site institucional",
    },
    {
      icon: "system",
      tag: "Gestão",
      title: "Sistemas web",
      description:
        "Ferramentas sob medida para a sua operação: painéis, cadastros, agendas e relatórios. Menos planilha, mais controle.",
      features: ["Feito para sua rotina", "Painel administrativo", "Acesso de qualquer lugar"],
      contact: "Sistema",
    },
    {
      icon: "automation",
      tag: "Eficiência",
      title: "Automações",
      description:
        "Conectamos suas ferramentas e eliminamos tarefas repetitivas — do WhatsApp à planilha — para sua equipe focar no que importa.",
      features: ["Integrações entre apps", "Menos trabalho manual", "Processos consistentes"],
      contact: "Automação",
    },
  ],
};

/* TEXTO PROVISÓRIO: substitua pela sua história real em /admin/conteudo. */
const story: SiteContent["story"] = {
  eyebrow: "02 · Como surgiu a Gardsoft",
  title: "Uma história construída",
  highlight: "linha por linha.",
  text: "A Gardsoft começou com uma inquietação: ver negócios incríveis perdendo espaço por não terem uma presença digital à altura do que entregam.",
  quote: "Toda grande ideia merece sair do papel. A Gardsoft nasceu para isso.",
  quoteAuthor: "Fundador da Gardsoft",
  chapters: [
    {
      label: "O começo",
      title: "Uma paixão que virou propósito",
      text: "Tudo começou com a curiosidade por tecnologia e a vontade de criar coisas que resolvessem problemas reais. Cada linha de código era um passo para entender como o digital podia mudar a rotina das pessoas.",
    },
    {
      label: "O primeiro projeto",
      title: "Uma ideia ganhou forma",
      text: "O primeiro projeto veio de uma conversa simples com um empreendedor que precisava ser encontrado na internet. Ver aquela ideia no ar — e os primeiros contatos chegando — mostrou o caminho a seguir.",
    },
    {
      label: "Nasce a Gardsoft",
      title: "Tecnologia com identidade",
      text: "Daí surgiu a Gardsoft: um estúdio que une design, código e estratégia para proteger e impulsionar negócios. O escudo da marca representa isso — cuidar do projeto do cliente como se fosse nosso.",
    },
    {
      label: "Hoje",
      title: "Do papel para o digital",
      text: "Hoje ajudamos empresas de diferentes segmentos a conquistar seu espaço on-line, com atendimento próximo, comunicação clara e soluções sob medida para cada momento do negócio.",
    },
  ],
  values: [
    { title: "Proximidade", text: "Você fala direto com quem constrói o seu projeto." },
    { title: "Transparência", text: "Etapas, prazos e entregas sempre claros." },
    { title: "Qualidade", text: "Cuidado com cada detalhe, do pixel ao código." },
  ],
};

const cases: SiteContent["cases"] = {
  eyebrow: "03 · Cases de sucesso",
  title: "Ideias que já",
  highlight: "ganharam o digital.",
  text: "Cada projeto nasce de uma história diferente. Clique e veja cada um funcionando ao vivo.",
  items: [
    {
      name: "MM Pescados",
      type: "Landing page",
      segment: "Alimentação",
      url: "https://mm-pescados-premium-landing.vercel.app/",
      theme: "sea",
      kicker: "Do mar para a sua mesa",
      headline: "O melhor do mar. Em cada escolha.",
      summary:
        "Uma vitrine premium para apresentar os produtos, transmitir frescor e levar o cliente direto ao pedido.",
      tags: ["Landing page", "Mobile first", "WhatsApp"],
      image: "",
      published: true,
    },
    {
      name: "CA Vidraçaria",
      type: "Site institucional",
      segment: "Arquitetura & construção",
      url: "https://www.cavidracaria.com.br/",
      theme: "glass",
      kicker: "Vidraçaria & esquadrias",
      headline: "Novas formas de ver o seu espaço.",
      summary:
        "Site institucional com serviços, portfólio e contato, reforçando a credibilidade da marca na região.",
      tags: ["Site institucional", "SEO", "Portfólio"],
      image: "",
      published: true,
    },
    {
      name: "GD Coração Gaúcho",
      type: "Landing page",
      segment: "Música & entretenimento",
      url: "https://landpage-gdcoracaogaucho.vercel.app/",
      theme: "music",
      kicker: "A nossa essência é a música",
      headline: "Coração Gaúcho.",
      summary:
        "Landing page para o grupo divulgar agenda, músicas e facilitar a contratação de shows.",
      tags: ["Landing page", "Agenda", "Contratação"],
      image: "",
      published: true,
    },
  ],
  nextTitle: "O próximo case pode ser o seu.",
  nextText: "Conte sua ideia e vamos construir juntos o seu lugar no digital.",
  nextCta: "Começar meu projeto",
};

const banners: SiteContent["banners"] = {
  ideaKicker: "Chega de deixar para depois",
  ideaTitle: "Sua ideia não foi feita para ficar no papel.",
  ideaText: "Em uma conversa rápida entendemos seu objetivo e mostramos o caminho para colocá-lo no ar.",
  ideaCta: "Tirar minha ideia do papel",
  leftKicker: "Seu concorrente já está no digital.",
  leftTitle: "E o seu negócio, vai ficar para trás?",
  leftText: "Um site rápido e bem feito é o vendedor que trabalha por você 24 horas por dia.",
  leftCta: "Quero meu site",
  rightKicker: "Planilhas demais? Tarefas repetidas?",
  rightTitle: "Deixe a tecnologia trabalhar por você.",
  rightText: "Sistemas e automações sob medida para ganhar tempo e ter mais controle da operação.",
  rightCta: "Quero automatizar",
};

const processSection: SiteContent["process"] = {
  eyebrow: "04 · Como funciona",
  title: "Do briefing ao",
  highlight: "projeto no ar.",
  text: "Um processo claro, com você participando de cada decisão. Sem surpresas, sem sumiço.",
  items: [
    {
      title: "Briefing inicial",
      text: "Uma conversa para entender seu negócio, seu público, seus objetivos e suas referências.",
      detail: "Conversa + diagnóstico",
    },
    {
      title: "Protótipo da ideia",
      text: "Montamos a estrutura e o rascunho das telas. Você enxerga o projeto antes de ele existir.",
      detail: "Estrutura + wireframe",
    },
    {
      title: "Design",
      text: "A interface ganha a cara da sua marca. Discutimos, ajustamos e aprovamos juntos.",
      detail: "Visual + ajustes",
    },
    {
      title: "Codificação e testes",
      text: "Desenvolvemos com tecnologia moderna e testamos em celulares, tablets e computadores.",
      detail: "Código + performance",
    },
    {
      title: "Briefing de entrega",
      text: "Revisamos tudo com você antes de publicar: últimos ajustes, textos e validação final.",
      detail: "Validação final",
    },
    {
      title: "Projeto no ar",
      text: "Publicação, domínio configurado e orientação para os próximos passos do seu negócio.",
      detail: "Lançamento + suporte",
    },
  ],
  ctaText: "Pronto para o passo 01? O briefing inicial é o começo de tudo.",
  ctaButton: "Agendar meu briefing",
};

/* EXEMPLOS PROVISÓRIOS: substitua por depoimentos reais antes de publicar. */
const testimonials: SiteContent["testimonials"] = {
  eyebrow: "05 · Avaliações",
  title: "Quem confiou,",
  highlight: "recomenda.",
  text: "O que nossos clientes dizem sobre a experiência de construir com a Gardsoft.",
  items: [
    {
      text: "Atendimento próximo do início ao fim. Entenderam exatamente o que eu precisava e o resultado superou o que eu imaginava.",
      name: "Nome do cliente",
      role: "Empresário · Alimentação",
    },
    {
      text: "O site ficou moderno, rápido e com a cara da nossa empresa. Os clientes elogiam e os contatos aumentaram.",
      name: "Nome do cliente",
      role: "Diretor · Construção",
    },
    {
      text: "Processo muito organizado: cada etapa era apresentada e aprovada. Nunca fiquei sem saber como estava o projeto.",
      name: "Nome do cliente",
      role: "Músico · Entretenimento",
    },
    {
      text: "A automação que fizeram economiza horas da nossa semana. Hoje não imagino a operação sem ela.",
      name: "Nome do cliente",
      role: "Gestora · Serviços",
    },
    {
      text: "Tirou minha ideia do papel com muita agilidade. Comunicação clara e entrega dentro do combinado.",
      name: "Nome do cliente",
      role: "Empreendedor · Varejo",
    },
    {
      text: "Profissionalismo e cuidado com cada detalhe. Recomendo para quem quer crescer no digital.",
      name: "Nome do cliente",
      role: "Proprietária · Beleza",
    },
  ],
};

const faq: SiteContent["faq"] = {
  eyebrow: "Bom saber",
  title: "Ficou alguma",
  highlight: "dúvida?",
  text: "As perguntas que mais ouvimos antes de começar um projeto.",
  items: [
    {
      q: "Qual a diferença entre site e landing page?",
      a: "A landing page concentra a comunicação em uma oferta e uma ação, como pedir um orçamento. O site apresenta a empresa de forma mais ampla, com espaço para serviços, conteúdos e diferentes caminhos de navegação.",
    },
    {
      q: "Meu negócio precisa de um sistema?",
      a: "Se planilhas e tarefas manuais já dificultam sua rotina, um sistema pode organizar informações e processos. No briefing inicial avaliamos o que faz sentido para o seu momento.",
    },
    {
      q: "Já tenho identidade visual. Vocês usam?",
      a: "Sim. O projeto segue sua logo, suas cores e seus materiais, criando uma experiência consistente com a sua marca. Se ainda não tiver, ajudamos a definir a direção visual.",
    },
    {
      q: "Quanto custa e quanto tempo leva?",
      a: "Depende do escopo, das funcionalidades e dos conteúdos. Depois do briefing, apresentamos uma proposta com entregas, prazos e condições claras.",
    },
    {
      q: "Vocês dão suporte depois que o projeto vai ao ar?",
      a: "Sim. Orientamos você no uso do projeto e podemos combinar manutenção, melhorias e novas funcionalidades conforme o negócio evolui.",
    },
  ],
};

const finalCta: SiteContent["finalCta"] = {
  badge: "Agenda aberta para novos projetos",
  title: "Vamos construir algo",
  highlight: "que faça diferença?",
  text: "Conte sua ideia. Em pouco tempo você recebe um direcionamento claro e uma proposta sob medida.",
  primaryCta: "Quero tirar minha ideia do papel",
  secondaryCta: "Ver como funciona",
};

const footer: SiteContent["footer"] = {
  description: "Design, código e estratégia para tirar ideias do papel e impulsionar negócios no digital.",
  contactText: "Tem um projeto em mente? Vamos conversar.",
  bottomText: "Tecnologia que impulsiona negócios.",
};

const site: SiteContent["site"] = {
  whatsapp: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, ""),
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "",
  facebook: "",
  linkedin: process.env.NEXT_PUBLIC_LINKEDIN_URL ?? "",
  tiktok: "",
  youtube: "",
};

export const defaults: SiteContent = {
  hero,
  marquee,
  services,
  story,
  cases,
  banners,
  process: processSection,
  testimonials,
  faq,
  finalCta,
  footer,
  site,
};
