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

/** Categorias financeiras. */
export const incomeCategories = ["Projetos", "Manutenção", "Hospedagem", "Consultoria", "Outros"] as const;
export const expenseCategories = [
  "Ferramentas e softwares",
  "Hospedagem e domínios",
  "Marketing e anúncios",
  "Freelancers",
  "Impostos",
  "Contabilidade",
  "Pró-labore",
  "Equipamentos",
  "Outros",
] as const;

export const paymentMethods = [
  { value: "boleto", label: "Boleto" },
  { value: "pix", label: "Pix" },
  { value: "cartao", label: "Cartão" },
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
