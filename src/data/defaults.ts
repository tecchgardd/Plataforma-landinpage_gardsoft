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
  lead: "A gente tira sua ideia do papel e transforma em tecnologia sob medida: rápida, bonita e pensada para atrair novos clientes para o seu negócio.",
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

const story: SiteContent["story"] = {
  eyebrow: "02 · Como surgiu a Gardsoft",
  title: "Do chão da infraestrutura",
  highlight: "ao código que gera negócios.",
  text: "Antes de escrever a primeira linha de código, foram anos resolvendo problemas reais de quem depende da tecnologia para trabalhar. É dessa base que nasce a Gardsoft.",
  quote: "Toda ideia simples pode ficar grande quando alguém cuida dela de verdade. A Gardsoft nasceu para isso.",
  quoteAuthor: "Fundador da Gardsoft",
  chapters: [
    {
      label: "2019 · Exército Brasileiro",
      title: "Disciplina e o primeiro contato com a tecnologia",
      text: "A jornada começou no Exército Brasileiro, atuando como técnico. Foi ali que nasceram a disciplina, o senso de responsabilidade e o gosto por manter tudo funcionando — mesmo quando ninguém está olhando.",
    },
    {
      label: "Iniciativa privada",
      title: "Suporte e infraestrutura N1, N2 e N3",
      text: "Depois de pedir baixa, veio a iniciativa privada. Do atendimento ao usuário até a infraestrutura mais crítica, cada nível de suporte ensinou a ouvir, diagnosticar e resolver o problema de quem precisa da tecnologia para trabalhar.",
    },
    {
      label: "Estrada profissional",
      title: "Experiência em empresas de peso",
      text: "MSI Tecnologia, Grupo Geração, Costão do Santinho e Compupack: ambientes diferentes, desafios diferentes e a mesma missão — fazer a operação rodar. Em paralelo, veio a decisão de ir além e estudar Análise e Desenvolvimento de Sistemas na UniCesusc.",
    },
    {
      label: "Nasce a Gardsoft",
      title: "Tirar ideias do papel e enriquecê-las",
      text: "Entre o Grupo Geração e o Costão do Santinho, a Gardsoft foi fundada com um propósito claro: trazer algo novo, pegar ideias — por mais simples que fossem — e transformá-las em soluções completas. O escudo da marca representa isso: cuidar do projeto do cliente como se fosse nosso.",
    },
    {
      label: "Hoje",
      title: "Infraestrutura no DNA, produto na entrega",
      text: "Hoje a Gardsoft cria sites, landing pages, sistemas e automações para negócios de diferentes segmentos — da música gaúcha aos pescados e ao pet shop. A bagagem de infraestrutura se traduz em projetos rápidos, seguros e estáveis; o desenvolvimento, em ferramentas pensadas para o resultado do negócio.",
    },
  ],
  values: [
    { title: "Proximidade", text: "Você fala direto com quem constrói o seu projeto." },
    { title: "Base sólida", text: "Anos de suporte e infraestrutura por trás de cada entrega." },
    { title: "Transparência", text: "Etapas, prazos e entregas sempre claros." },
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
      image: "/assets/cases/mm-pescados.jpg",
      video: "",
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
      image: "/assets/cases/ca-vidracaria.jpg",
      video: "",
      published: true,
    },
    {
      name: "GD Coração Gaúcho",
      type: "Site institucional",
      segment: "Dança & tradição gaúcha",
      url: "https://landpage-gdcoracaogaucho.vercel.app/",
      theme: "music",
      kicker: "Tradição · Cultura · Família",
      headline: "O coração da tradição gaúcha bate aqui.",
      summary:
        "Site do grupo de danças com bilheteria para os eventos, turmas do curso de dança, álbuns de formatura e blog.",
      tags: ["Site institucional", "Bilheteria", "Blog"],
      image: "/assets/cases/gd-coracao-gaucho.jpg",
      video: "",
      published: true,
    },
    {
      name: "Aloha Pet",
      type: "Landing page",
      segment: "Pet care",
      url: "https://alohapet-landinpage-upjw.vercel.app/",
      theme: "pet",
      kicker: "Banho & tosa · Vet em casa",
      headline: "Banho com carinho. Cuidado que dá para sentir.",
      summary:
        "Landing page que reúne banho e tosa, veterinário em domicílio e pet shop, com agendamento direto pelo WhatsApp.",
      tags: ["Landing page", "Agendamento", "WhatsApp"],
      image: "/assets/cases/aloha-pet.jpg",
      video: "",
      published: true,
    },
    {
      name: "Portal Gaúcho",
      type: "Site institucional",
      segment: "Música & entretenimento",
      url: "https://portalgaucho.vercel.app/",
      theme: "rodeo",
      kicker: "Fandango e vaneira desde 1999",
      headline: "O Tranco Véio mais famoso do Brasil.",
      summary:
        "Site completo do grupo com história, músicos, clipes, discografia e contratação de shows com mensagem pronta no WhatsApp.",
      tags: ["Site institucional", "Discografia", "Contratação"],
      image: "/assets/cases/portal-gaucho.jpg",
      video: "",
      published: true,
    },
    {
      name: "CA Esquadrias",
      type: "Landing page",
      segment: "Arquitetura & construção",
      url: "https://caesquadrias-pvc.vercel.app/",
      theme: "glass",
      kicker: "Esquadrias sob medida · Palhoça/SC",
      headline: "Esquadrias de alumínio sob medida.",
      summary:
        "Página focada em orçamento: fachadas, esquadrias termoacústicas e portões, com prova social das avaliações no Google.",
      tags: ["Landing page", "Orçamento", "Prova social"],
      image: "/assets/cases/ca-esquadrias.jpg",
      video: "",
      published: true,
    },
    {
      name: "Chê Lokedo",
      type: "Landing page",
      segment: "Música & entretenimento",
      url: "https://chelokedo.vercel.app/",
      theme: "music",
      kicker: "O baile é dos guri",
      headline: "A gaita puxa, a galera canta e a noite vira história.",
      summary:
        "Página do artista com clipes, agenda de bailes por RS, SC e PR, material de imprensa e contratação com a produção.",
      tags: ["Landing page", "Press kit", "Contratação"],
      image: "/assets/cases/che-lokedo.jpg",
      video: "",
      published: true,
    },
    {
      name: "Grupo Mate Amargo",
      type: "Site institucional",
      segment: "Música & entretenimento",
      url: "https://grupomateamargo-landindpage.vercel.app/",
      theme: "pampa",
      kicker: "Forquilhinha/SC · desde 2015",
      headline: "A alma gaúcha. A energia do baile.",
      summary:
        "Site com história, discografia, playlist de clipes, agenda e contato direto com os integrantes para fechar datas.",
      tags: ["Site institucional", "Agenda", "Downloads"],
      image: "/assets/cases/mate-amargo.jpg",
      video: "",
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

/* Só depoimentos reais, com autorização do cliente. Sem nenhum, a seção e o link do menu ficam ocultos. */
const testimonials: SiteContent["testimonials"] = {
  eyebrow: "05 · Avaliações",
  title: "Quem confiou,",
  highlight: "recomenda.",
  text: "O que nossos clientes dizem sobre a experiência de construir com a Gardsoft.",
  items: [],
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
