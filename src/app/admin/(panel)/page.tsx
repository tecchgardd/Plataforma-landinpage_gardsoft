import Link from "next/link";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import { StageBadge, StatusBadge, TempBadge } from "@/components/admin/Badges";
import { fromDbDate, prisma } from "@/lib/prisma";
import { getAccess, requireAccess } from "@/lib/access";
import { dateTime, money, shortDate } from "@/lib/admin/format";
import { leadStatuses, temperatures } from "@/lib/admin/options";
import { dayInBrazil, parseMonth } from "@/lib/admin/month";
import { salesBetween } from "@/lib/admin/revenue";
import LeadsChart from "./LeadsChart";
import MoneyToggle from "@/components/admin/MoneyToggle";

export const metadata = { title: "Dashboard" };

const IN_PROGRESS = ["contato", "proposta", "negociacao"];

/** Itens de receita exibidos no dashboard (ordem e rótulos). */
const revenueItems = [
  { service: "Landing page", label: "Landing pages" },
  { service: "Site institucional", label: "Sites institucionais" },
  { service: "Sistema", label: "Sistemas" },
  { service: "Automação", label: "Automações" },
  { service: "Manutenção", label: "Manutenções" },
];

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const user = await requireAccess("dashboard", 1);
  // Valores de venda só para quem vê o Financeiro.
  const seesMoney = ((await getAccess())?.level("financeiro") ?? 0) > 0;
  const month = parseMonth((await searchParams).mes);
  const inMonth = { gte: month.start, lt: month.end };
  const today = new Date().toISOString().slice(0, 10);
  const in14 = new Date(`${new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10)}T00:00:00Z`);
  const open = { status: { notIn: ["fechado", "perdido"] } };

  const [monthLeads, byStatusRaw, byTempRaw, recent, dueSoon, inProgressProjects, soldProjects, negotiating, campaigns] = await Promise.all([
    prisma.lead.findMany({
      where: { createdAt: inMonth },
      select: { createdAt: true, status: true, campaignId: true },
    }),
    prisma.lead.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.lead.groupBy({ by: ["temperature"], where: open, _count: { _all: true } }),
    prisma.lead.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.project.findMany({
      where: { stage: { not: "no_ar" }, dueDate: { not: null, lt: in14 } },
      orderBy: { dueDate: "asc" },
      take: 6,
      select: { id: true, name: true, stage: true, dueDate: true },
    }),
    prisma.project.count({ where: { stage: { not: "no_ar" } } }),
    // Receita = só o que foi vendido no mês (orçamento aprovado, contrato assinado ou lead fechado).
    salesBetween(month.start, month.end),
    // Em negociação: orçamentos enviados aguardando resposta, dentro da validade (ainda não são receita).
    prisma.quote.aggregate({
      where: { status: { in: ["enviado", "visualizado"] }, OR: [{ validUntil: null }, { validUntil: { gte: new Date(`${today}T00:00:00Z`) } }] },
      _sum: { totalCents: true },
      _count: { _all: true },
    }),
    prisma.campaign.findMany({ select: { id: true, name: true, budgetCents: true, status: true } }),
  ]);

  // ---------- leads do mês ----------
  const count = (fn: (s: string) => boolean) => monthLeads.filter((l) => fn(l.status)).length;
  const closedInMonth = count((s) => s === "fechado");
  const conversion = monthLeads.length ? Math.round((closedInMonth / monthLeads.length) * 100) : 0;
  const leadCards = [
    { label: "Leads no mês", value: monthLeads.length, hint: "Todos os contatos recebidos", group: "", tone: "total" },
    { label: "Novos", value: count((s) => s === "novo"), hint: "Aguardando o primeiro contato", group: "aguardando", tone: "novo" },
    { label: "Em contato", value: count((s) => IN_PROGRESS.includes(s)), hint: "Contato feito, esboço ou negociação", group: "andamento", tone: "contato" },
    { label: "Sem interesse", value: count((s) => s === "perdido"), hint: "Esfriaram — bons para repescagem", group: "nao-fechados", tone: "perdido" },
    {
      label: "Fechados",
      value: closedInMonth,
      hint: monthLeads.length ? `${conversion}% de conversão` : "Viraram projeto",
      group: "fechados",
      tone: "fechado",
    },
  ];
  const leadsHref = (group: string) => `/admin/leads?mes=${month.key}${group ? `&grupo=${group}` : ""}`;

  // ---------- receita por item ----------
  const known = new Set(revenueItems.map((r) => r.service));
  const revenue = revenueItems.map((item) => {
    const sold = soldProjects.filter((p) => p.service === item.service);
    return { label: item.label, total: sold.reduce((s, p) => s + p.valueCents, 0), qty: sold.length };
  });
  const others = soldProjects.filter((p) => !p.service || !known.has(p.service));
  if (others.length) revenue.push({ label: "Outros", total: others.reduce((s, p) => s + p.valueCents, 0), qty: others.length });
  const revenueTotal = soldProjects.reduce((s, p) => s + p.valueCents, 0);
  const revenueMax = Math.max(1, ...revenue.map((r) => r.total));
  const negotiatingTotal = negotiating._sum.totalCents ?? 0;
  const negotiatingCount = negotiating._count._all;

  // ---------- gráfico e campanhas ----------
  const perDay = Array.from({ length: month.days }, () => 0);
  for (const l of monthLeads) perDay[dayInBrazil(l.createdAt) - 1]++;
  const lastDay = month.next === null ? dayInBrazil(new Date()) : month.days;

  const campaignRows = [
    ...campaigns.map((c) => {
      const leads = monthLeads.filter((l) => l.campaignId === c.id);
      return {
        id: c.id as string | null,
        name: c.name,
        leads: leads.length,
        closed: leads.filter((l) => l.status === "fechado").length,
        budget: c.budgetCents,
        active: c.status === "ativa",
      };
    }),
    {
      id: null,
      name: "Orgânico (site, sem campanha)",
      leads: monthLeads.filter((l) => !l.campaignId).length,
      closed: monthLeads.filter((l) => !l.campaignId && l.status === "fechado").length,
      budget: 0,
      active: false,
    },
  ]
    .filter((r) => r.leads > 0 || r.active)
    .sort((a, b) => b.leads - a.leads);
  const campaignMax = Math.max(1, ...campaignRows.map((r) => r.leads));

  // ---------- funil e temperatura (todos os leads) ----------
  const statusCount = Object.fromEntries(byStatusRaw.map((r) => [r.status, r._count._all]));
  const tempCount = Object.fromEntries(byTempRaw.map((r) => [r.temperature, r._count._all]));
  const funnelMax = Math.max(1, ...byStatusRaw.map((r) => r._count._all));
  const openTotal = byTempRaw.reduce((s, r) => s + r._count._all, 0);
  const firstName = user.name.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Olá, ${firstName}!`}
        subtitle="Como estão os leads, a receita e as campanhas no mês."
        actions={
          <>
          {seesMoney && <MoneyToggle />}
          <nav className="adm-month" aria-label="Mês do relatório">
            <Link href={`/admin?mes=${month.prev}`} aria-label="Mês anterior">
              ←
            </Link>
            <strong>{month.label}</strong>
            {month.next ? (
              <Link href={`/admin?mes=${month.next}`} aria-label="Próximo mês">
                →
              </Link>
            ) : (
              <span aria-hidden="true">→</span>
            )}
          </nav>
          </>
        }
      />

      <section className="adm-lead-kpis" aria-label="Leads do mês">
        {leadCards.map((card) => (
          <Link key={card.label} href={leadsHref(card.group)} className={`adm-kpi kpi-${card.tone}`}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <small>{card.hint}</small>
          </Link>
        ))}
      </section>

      {seesMoney && (
        <section className="adm-card">
          <div className="adm-card-head">
            <div>
              <h2>Receita do mês</h2>
              <p className="adm-card-sub">
                Projetos vendidos em {month.label}: orçamento aprovado, contrato assinado ou negócio fechado no lead.
              </p>
            </div>
            <div className="adm-revenue-total">
              <small>Total</small>
              <strong className="adm-money">{money(revenueTotal)}</strong>
              <small>
                {soldProjects.length} projeto{soldProjects.length === 1 ? "" : "s"}
              </small>
            </div>
          </div>
          {negotiatingCount > 0 && (
            <Link href="/admin/orcamentos?status=abertos" className="adm-pipeline-note">
              <span>Em negociação</span>
              <strong className="adm-money">{money(negotiatingTotal)}</strong>
              <small>
                {negotiatingCount} orçamento{negotiatingCount === 1 ? "" : "s"} aguardando resposta · entra na receita quando for aprovado
              </small>
            </Link>
          )}
          <div className="adm-revenue">
            {revenue.map((r) => (
              <div key={r.label} className="adm-revenue-item">
                <span>{r.label}</span>
                <strong className="adm-money">{money(r.total)}</strong>
                <span className="adm-bar-track">
                  {r.total > 0 && <span className="adm-bar" style={{ width: `${(r.total / revenueMax) * 100}%` }} />}
                </span>
                <small>
                  {r.qty} venda{r.qty === 1 ? "" : "s"}
                  {revenueTotal > 0 && r.total > 0 && ` · ${Math.round((r.total / revenueTotal) * 100)}%`}
                </small>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="adm-grid-2">
        <section className="adm-card">
          <h2>Funil de vendas</h2>
          <p className="adm-card-sub">Todos os leads, por etapa.</p>
          <ul className="adm-bars">
            {leadStatuses.map((s) => {
              const n = statusCount[s.value] ?? 0;
              return (
                <li key={s.value} title={`${s.label}: ${n}`}>
                  <Link href={`/admin/leads?status=${s.value}`}>{s.label}</Link>
                  <span className="adm-bar-track">
                    {n > 0 && <span className="adm-bar" style={{ width: `${(n / funnelMax) * 100}%` }} />}
                  </span>
                  <b>{n}</b>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="adm-card adm-temp-card">
          <h2>Temperatura dos leads em aberto</h2>
          <p className="adm-card-sub">{openTotal} leads ainda em negociação.</p>
          <div className="adm-temps">
            {temperatures.map((t) => {
              const n = tempCount[t.value] ?? 0;
              return (
                <Link key={t.value} href={`/admin/leads?temperatura=${t.value}`} className={`adm-temp temp-${t.value}`}>
                  <span aria-hidden="true">{t.icon}</span>
                  <strong>{n}</strong>
                  <small>
                    {t.label} · {openTotal ? Math.round((n / openTotal) * 100) : 0}%
                  </small>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <div className="adm-grid-chart">
        <section className="adm-card">
          <h2>Leads por dia</h2>
          <p className="adm-card-sub">
            {monthLeads.length} lead{monthLeads.length === 1 ? "" : "s"} em {month.label}
          </p>
          <LeadsChart perDay={perDay} lastDay={lastDay} monthKey={month.key} />
        </section>

        <section className="adm-card">
          <div className="adm-card-head">
            <div>
              <h2>Desempenho das campanhas</h2>
              <p className="adm-card-sub">Leads de {month.label} por origem.</p>
            </div>
            <Link href="/admin/campanhas">Gerenciar →</Link>
          </div>
          {campaignRows.length === 0 ? (
            <Empty title="Nenhum lead neste mês">Os leads aparecem aqui separados por campanha.</Empty>
          ) : (
            <ul className="adm-camp-bars">
              {campaignRows.map((c) => (
                <li key={c.id ?? "organico"}>
                  <div className="adm-camp-line">
                    {c.id ? <Link href={`/admin/campanhas/${c.id}`}>{c.name}</Link> : <span>{c.name}</span>}
                    <b>{c.leads}</b>
                  </div>
                  <span className="adm-bar-track" title={`${c.name}: ${c.leads} leads`}>
                    {c.leads > 0 && <span className="adm-bar" style={{ width: `${(c.leads / campaignMax) * 100}%` }} />}
                  </span>
                  <small>
                    {c.closed} fechado{c.closed === 1 ? "" : "s"}
                    {c.leads > 0 && ` · ${Math.round((c.closed / c.leads) * 100)}% de conversão`}
                    {c.budget > 0 && c.leads > 0 && (
                      <>
                        {" · "}
                        <span className="adm-money">{money(Math.round(c.budget / c.leads))}</span> por lead
                      </>
                    )}
                  </small>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="adm-grid-2">
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Leads recentes</h2>
            <Link href="/admin/leads">Ver todos →</Link>
          </div>
          {recent.length === 0 ? (
            <Empty title="Nenhum lead ainda">Os contatos enviados pelo site aparecem aqui automaticamente.</Empty>
          ) : (
            <ul className="adm-list">
              {recent.map((lead) => (
                <li key={lead.id}>
                  <Link href={`/admin/leads/${lead.id}`}>
                    <span>
                      <strong>{lead.name}</strong>
                      <small>
                        {lead.service ?? "Sem serviço"} · {dateTime(lead.createdAt)}
                      </small>
                    </span>
                    <span className="adm-list-badges">
                      <TempBadge value={lead.temperature} />
                      <StatusBadge value={lead.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="adm-card">
          <div className="adm-card-head">
            <div>
              <h2>Próximos prazos</h2>
              <p className="adm-card-sub">
                {inProgressProjects} projeto{inProgressProjects === 1 ? "" : "s"} em andamento
              </p>
            </div>
            <Link href="/admin/projetos">Ver projetos →</Link>
          </div>
          {dueSoon.length === 0 ? (
            <Empty title="Nenhum prazo nos próximos 14 dias" />
          ) : (
            <ul className="adm-list">
              {dueSoon.map((p) => {
                const due = fromDbDate(p.dueDate);
                return (
                  <li key={p.id}>
                    <Link href={`/admin/projetos/${p.id}`}>
                      <span>
                        <strong>{p.name}</strong>
                        <small className={due && due < today ? "late" : ""}>
                          {due && due < today ? "Atrasado · " : "Entrega · "}
                          {shortDate(due)}
                        </small>
                      </span>
                      <StageBadge value={p.stage} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
