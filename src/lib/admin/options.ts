/** Listas de opções do portal. A ordem aqui é a ordem exibida nos filtros e no funil. */

export const leadStatuses = [
  { value: "novo", label: "Aguardando contato" },
  { value: "contato", label: "Primeiro contato feito" },
  { value: "proposta", label: "Esboço em andamento" },
  { value: "negociacao", label: "Negociação" },
  { value: "fechado", label: "Projeto fechado" },
  { value: "perdido", label: "Sem interesse" },
] as const;

/** Agrupamentos usados nos filtros rápidos da lista de leads e no dashboard. */
export const leadGroups = [
  { value: "aguardando", label: "Aguardando contato", statuses: ["novo"] },
  { value: "andamento", label: "Em andamento", statuses: ["contato", "proposta", "negociacao"] },
  { value: "fechados", label: "Fechados", statuses: ["fechado"] },
  { value: "nao-fechados", label: "Não fechados", statuses: ["perdido"] },
] as const;

export const temperatures = [
  { value: "quente", label: "Quente", icon: "🔥" },
  { value: "morno", label: "Morno", icon: "☀️" },
  { value: "frio", label: "Frio", icon: "❄️" },
] as const;

export const leadSources = [
  { value: "site", label: "Site" },
  { value: "campanha", label: "Campanha" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "instagram", label: "Instagram" },
  { value: "indicacao", label: "Indicação" },
  { value: "outro", label: "Outro" },
] as const;

export const projectStages = [
  { value: "briefing", label: "Briefing inicial" },
  { value: "prototipo", label: "Protótipo" },
  { value: "design", label: "Design" },
  { value: "codificacao", label: "Codificação e testes" },
  { value: "entrega", label: "Briefing de entrega" },
  { value: "no_ar", label: "No ar" },
] as const;

export const campaignChannels = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "google", label: "Google Ads" },
  { value: "youtube", label: "YouTube" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-mail" },
  { value: "indicacao", label: "Indicação" },
  { value: "offline", label: "Flyer / impressos" },
  { value: "evento", label: "Evento" },
  { value: "outro", label: "Outro" },
] as const;

/** O que foi investido na campanha. */
export const costTypes = [
  { value: "trafego", label: "Tráfego pago (anúncios)" },
  { value: "impressos", label: "Flyer / impressos" },
  { value: "influenciador", label: "Influenciador / parceria" },
  { value: "producao", label: "Produção de conteúdo / criativos" },
  { value: "evento", label: "Evento / patrocínio" },
  { value: "brindes", label: "Brindes" },
  { value: "ferramentas", label: "Ferramentas / softwares" },
  { value: "outro", label: "Outro" },
] as const;

export const campaignStatuses = [
  { value: "planejada", label: "Planejada" },
  { value: "ativa", label: "Ativa" },
  { value: "pausada", label: "Pausada" },
  { value: "encerrada", label: "Encerrada" },
] as const;

export const serviceOptions = [
  { value: "Landing page", label: "Landing page" },
  { value: "Site institucional", label: "Site institucional" },
  { value: "Sistema", label: "Sistema" },
  { value: "Automação", label: "Automação" },
  { value: "Manutenção", label: "Manutenção" },
  { value: "Outro", label: "Outro" },
] as const;

type Option = { readonly value: string; readonly label: string };

export function labelOf(options: readonly Option[], value: string | null | undefined) {
  return options.find((o) => o.value === value)?.label ?? value ?? "—";
}

export function values<T extends readonly Option[]>(options: T) {
  return options.map((o) => o.value) as unknown as [T[number]["value"], ...T[number]["value"][]];
}

/** O que está sendo cobrado (vira a categoria da conta a receber). */
export const incomeCategories = ["Projetos", "Manutenção", "Hospedagem", "Consultoria", "Outros"] as const;

/** Tipos de despesa, agrupados. O rótulo vira a categoria da conta a pagar. */
export const expenseTypes = [
  { value: "software", label: "Ferramenta / software (SaaS)", group: "Softwares e ferramentas", hint: "Notion, Canva, Trello" },
  { value: "ia", label: "Inteligência artificial (IA)", group: "Softwares e ferramentas", hint: "Claude, ChatGPT, Midjourney" },
  { value: "design", label: "Design e criação", group: "Softwares e ferramentas", hint: "Figma, Adobe, banco de imagens" },
  { value: "dev", label: "Desenvolvimento e APIs", group: "Softwares e ferramentas", hint: "GitHub, APIs pagas, licenças" },
  { value: "produtividade", label: "Produtividade e comunicação", group: "Softwares e ferramentas", hint: "Google Workspace, Slack, Zoom" },
  { value: "hospedagem", label: "Hospedagem de sites", group: "Infraestrutura", hint: "Vercel, Hostinger, Netlify" },
  { value: "servidor", label: "Servidor / VPS / cloud", group: "Infraestrutura", hint: "AWS, DigitalOcean, Hetzner" },
  { value: "banco", label: "Banco de dados", group: "Infraestrutura", hint: "Neon, Supabase, PlanetScale" },
  { value: "dominio", label: "Domínio", group: "Infraestrutura", hint: "Registro.br, GoDaddy" },
  { value: "email", label: "E-mail e envio", group: "Infraestrutura", hint: "Resend, e-mail profissional" },
  { value: "armazenamento", label: "Armazenamento / CDN", group: "Infraestrutura", hint: "Cloudinary, S3, Cloudflare" },
  { value: "anuncios", label: "Anúncios / tráfego pago", group: "Marketing", hint: "Meta Ads, Google Ads" },
  { value: "impressos", label: "Material gráfico e impressos", group: "Marketing", hint: "Panfletos, cartões, banners" },
  { value: "marketing", label: "Marketing (outros)", group: "Marketing", hint: "Agência, influenciador, eventos" },
  { value: "freelancer", label: "Freelancer / terceirizado", group: "Pessoas", hint: "Designer, dev, redator" },
  { value: "prolabore", label: "Pró-labore", group: "Pessoas" },
  { value: "salarios", label: "Salários e benefícios", group: "Pessoas" },
  { value: "contabilidade", label: "Contabilidade", group: "Administrativo" },
  { value: "impostos", label: "Impostos e taxas do governo", group: "Administrativo", hint: "DAS, ISS, alvará" },
  { value: "tarifas", label: "Tarifas bancárias e de gateway", group: "Administrativo", hint: "Asaas, banco, maquininha" },
  { value: "internet", label: "Internet e telefone", group: "Administrativo" },
  { value: "escritorio", label: "Aluguel / coworking", group: "Administrativo" },
  { value: "equipamentos", label: "Equipamentos", group: "Administrativo", hint: "Computador, monitor, periféricos" },
  { value: "cursos", label: "Cursos e capacitação", group: "Administrativo" },
  { value: "outros", label: "Outros", group: "Administrativo" },
] as const;

export const expenseFrequencies = [
  { value: "mensal", label: "Mensal (todo mês)" },
  { value: "anual", label: "Anual (uma vez por ano)" },
  { value: "unica", label: "Única (só uma vez)" },
] as const;

export const paymentMethods = [
  { value: "boleto", label: "Boleto" },
  { value: "pix", label: "Pix" },
  { value: "cartao", label: "Cartão de crédito" },
  { value: "debito", label: "Débito / débito automático" },
  { value: "transferencia", label: "Transferência" },
  { value: "dinheiro", label: "Dinheiro" },
] as const;

export const contractStatuses = [
  { value: "rascunho", label: "Rascunho" },
  { value: "enviado", label: "Enviado" },
  { value: "visualizado", label: "Visualizado pelo cliente" },
  { value: "assinado", label: "Assinado" },
  { value: "cancelado", label: "Cancelado" },
] as const;

/** Vencido é calculado pela validade (status enviado/visualizado com a data passada). */
export const quoteStatuses = [
  { value: "rascunho", label: "Rascunho" },
  { value: "enviado", label: "Enviado" },
  { value: "visualizado", label: "Visualizado pelo cliente" },
  { value: "aprovado", label: "Aprovado" },
  { value: "recusado", label: "Recusado" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export const invoiceStatuses = [
  { value: "emitida", label: "Emitida" },
  { value: "pendente", label: "Pendente" },
  { value: "cancelada", label: "Cancelada" },
  { value: "erro", label: "Com erro" },
] as const;
