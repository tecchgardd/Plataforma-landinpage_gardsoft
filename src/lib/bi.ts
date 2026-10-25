/** Métricas com meta mensal no BI. */
export const goalMetrics = [
  { key: "faturamento", label: "Faturamento recebido", unit: "money", hint: "Dinheiro que entrou (cobranças pagas no mês)." },
  { key: "vendas", label: "Vendas fechadas", unit: "money", hint: "Valor dos projetos vendidos no mês." },
  { key: "projetos", label: "Projetos vendidos", unit: "count", hint: "Quantidade de projetos fechados." },
  { key: "leads", label: "Leads", unit: "count", hint: "Contatos novos recebidos." },
  { key: "clientes", label: "Clientes novos", unit: "count", hint: "Clientes cadastrados no mês." },
  { key: "conversao", label: "Conversão de leads", unit: "percent", hint: "Leads do mês que viraram negócio fechado (%)." },
] as const;

export type GoalMetric = (typeof goalMetrics)[number]["key"];

export const periods = [
  { value: "6", label: "6 meses" },
  { value: "12", label: "12 meses" },
  { value: "24", label: "24 meses" },
] as const;
