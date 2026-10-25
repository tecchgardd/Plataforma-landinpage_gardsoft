import "server-only";
import { prisma } from "./prisma";
import { salesBetween } from "./admin/revenue";
import type { GoalMetric } from "./bi";

const monthShort = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const utcMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 1));
const keyOf = (d: Date) => d.toISOString().slice(0, 7);
/** Mês em Brasília (UTC−3) de um instante (createdAt etc.). */
const brKey = (d: Date) => new Date(d.getTime() - 3 * 3600e3).toISOString().slice(0, 7);

export type MonthRow = {
  key: string;
  label: string;
  received: number;
  paid: number;
  sold: number;
  projects: number;
  leads: number;
  closedLeads: number;
  clients: number;
};

/** Painel do BI: série mensal, vendas por serviço, origem dos leads, campanhas e o mês atual vs metas. */
export async function biData(monthsBack: number) {
  const now = new Date(Date.now() - 3 * 3600e3);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const months = Array.from({ length: monthsBack }, (_, i) => utcMonth(y, m - monthsBack + 1 + i));
  const start = months[0];
  const end = utcMonth(y, m + 1);
  // Para a variação: o mesmo tamanho de período, imediatamente antes.
  const prevStart = utcMonth(y, m - 2 * monthsBack + 1);
  // Datas de criação são instantes: ajusta o corte para o fuso de Brasília.
  const tzStart = new Date(start.getTime() + 3 * 3600e3);
  const tzEnd = new Date(end.getTime() + 3 * 3600e3);

  const [entries, sales, prevSales, prevEntries, leads, clients, campaigns, goals] = await Promise.all([
    prisma.financeEntry.findMany({
      where: { status: "pago", paidAt: { gte: start, lt: end } },
      select: { type: true, paidAt: true, paidAmountCents: true, amountCents: true },
    }),
    salesBetween(tzStart, tzEnd),
    salesBetween(new Date(prevStart.getTime() + 3 * 3600e3), tzStart),
    prisma.financeEntry.aggregate({ where: { type: "receber", status: "pago", paidAt: { gte: prevStart, lt: start } }, _sum: { paidAmountCents: true, amountCents: true } }),
    prisma.lead.findMany({ where: { createdAt: { gte: tzStart, lt: tzEnd } }, select: { createdAt: true, status: true, source: true, campaignId: true } }),
    prisma.client.findMany({ where: { createdAt: { gte: tzStart, lt: tzEnd } }, select: { createdAt: true } }),
    prisma.campaign.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        budgetCents: true,
        channels: true,
        leads: { where: { createdAt: { gte: tzStart, lt: tzEnd } }, select: { status: true, projects: { select: { id: true } } } },
      },
    }),
    prisma.goal.findMany({ where: { month: keyOf(utcMonth(y, m)) } }),
  ]);

  const rows: MonthRow[] = months.map((d) => ({
    key: keyOf(d),
    label: `${monthShort[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`,
    received: 0,
    paid: 0,
    sold: 0,
    projects: 0,
    leads: 0,
    closedLeads: 0,
    clients: 0,
  }));
  const row = (key: string) => rows.find((r) => r.key === key);
  for (const e of entries) {
    const r = row(keyOf(e.paidAt!));
    if (!r) continue;
    const v = e.paidAmountCents ?? e.amountCents;
    if (e.type === "receber") r.received += v;
    else r.paid += v;
  }
  for (const s of sales) {
    const r = row(brKey(s.soldAt));
    if (r) {
      r.sold += s.valueCents;
      r.projects++;
    }
  }
  for (const l of leads) {
    const r = row(brKey(l.createdAt));
    if (!r) continue;
    r.leads++;
    if (l.status === "fechado") r.closedLeads++;
  }
  for (const c of clients) {
    const r = row(brKey(c.createdAt));
    if (r) r.clients++;
  }

  const sum = (k: keyof Omit<MonthRow, "key" | "label">) => rows.reduce((s, r) => s + r[k], 0);
  const totals = {
    received: sum("received"),
    paid: sum("paid"),
    sold: sum("sold"),
    projects: sum("projects"),
    leads: sum("leads"),
    closedLeads: sum("closedLeads"),
    clients: sum("clients"),
  };
  const prev = {
    received: prevEntries._sum.paidAmountCents ?? prevEntries._sum.amountCents ?? 0,
    sold: prevSales.reduce((s, x) => s + x.valueCents, 0),
  };

  // Vendas por serviço/produto.
  const byService = new Map<string, { label: string; cents: number; count: number }>();
  for (const s of sales) {
    const label = s.service || "Sem serviço definido";
    const item = byService.get(label) ?? { label, cents: 0, count: 0 };
    item.cents += s.valueCents;
    item.count++;
    byService.set(label, item);
  }

  // Origem dos leads.
  const bySource = new Map<string, { label: string; leads: number; closed: number }>();
  for (const l of leads) {
    const label = l.source || "outros";
    const item = bySource.get(label) ?? { label, leads: 0, closed: 0 };
    item.leads++;
    if (l.status === "fechado") item.closed++;
    bySource.set(label, item);
  }

  // Campanhas: leads, fechados, investimento, custo por lead e vendas geradas.
  const soldByProject = new Map(sales.map((s) => [s.projectId, s.valueCents]));
  const campaignRows = campaigns
    .map((c) => {
      const closed = c.leads.filter((l) => l.status === "fechado").length;
      const revenue = c.leads.flatMap((l) => l.projects).reduce((s, p) => s + (soldByProject.get(p.id) ?? 0), 0);
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        channels: c.channels,
        budget: c.budgetCents,
        leads: c.leads.length,
        closed,
        cpl: c.leads.length ? Math.round(c.budgetCents / c.leads.length) : null,
        revenue,
        roi: c.budgetCents ? (revenue - c.budgetCents) / c.budgetCents : null,
      };
    })
    .filter((c) => c.leads > 0 || c.budget > 0)
    .sort((a, b) => b.revenue - a.revenue || b.leads - a.leads);

  // Mês atual: realizado, meta e projeção pelo ritmo dos dias corridos.
  const current = rows.at(-1)!;
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const elapsed = now.getUTCDate();
  const actual: Record<GoalMetric, number> = {
    faturamento: current.received,
    vendas: current.sold,
    projetos: current.projects,
    leads: current.leads,
    clientes: current.clients,
    conversao: current.leads ? Math.round((current.closedLeads / current.leads) * 10000) : 0,
  };
  const goalOf = (metric: string) => goals.find((g) => g.metric === metric)?.target ?? null;

  return {
    rows,
    totals,
    prev,
    byService: [...byService.values()].sort((a, b) => b.cents - a.cents),
    bySource: [...bySource.values()].sort((a, b) => b.leads - a.leads),
    campaigns: campaignRows,
    month: { key: current.key, daysInMonth, elapsed, actual, goal: goalOf },
  };
}

/** Histórico de metas × realizado (para a tabela de planejamento). */
export async function goalHistory(rows: MonthRow[]) {
  const goals = await prisma.goal.findMany({ where: { month: { in: rows.map((r) => r.key) } } });
  return rows.map((r) => ({
    ...r,
    goals: Object.fromEntries(goals.filter((g) => g.month === r.key).map((g) => [g.metric, g.target])) as Partial<Record<GoalMetric, number>>,
  }));
}
