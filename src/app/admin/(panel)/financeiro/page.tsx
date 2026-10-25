import Link from "next/link";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import { ContractBadge, EntryBadge } from "@/components/admin/Badges";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/access";
import { money, shortDate } from "@/lib/admin/format";
import { parseMonth } from "@/lib/admin/month";
import { asaasConfigured, asaasEnvironment } from "@/lib/integrations/asaas";
import { emailConfigured, emailProvider } from "@/lib/integrations/email";
import { syncRecurringExpenses } from "@/lib/finance/expenses";

export const metadata = { title: "Financeiro" };

const monthShort = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function utcMonth(key: string, offset = 0) {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + offset, 1));
}

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await requireAccess("financeiro", 1);
  await syncRecurringExpenses();
  const month = parseMonth((await searchParams).mes);
  const start = utcMonth(month.key);
  const end = utcMonth(month.key, 1);
  const sixAgo = utcMonth(month.key, -5);
  const today = new Date(`${new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10)}T00:00:00Z`);
  const in30 = new Date(today.getTime() + 30 * 864e5);

  const [paidInMonth, dueInMonth, overdue, history, upcomingIn, upcomingOut, awaiting] = await Promise.all([
    prisma.financeEntry.groupBy({
      by: ["type"],
      where: { status: "pago", paidAt: { gte: start, lt: end } },
      _sum: { paidAmountCents: true, amountCents: true },
    }),
    prisma.financeEntry.groupBy({ by: ["type"], where: { status: "pendente", dueDate: { gte: start, lt: end } }, _sum: { amountCents: true } }),
    prisma.financeEntry.groupBy({ by: ["type"], where: { status: "pendente", dueDate: { lt: today } }, _sum: { amountCents: true }, _count: { _all: true } }),
    prisma.financeEntry.findMany({
      where: { status: "pago", paidAt: { gte: sixAgo, lt: end } },
      select: { type: true, paidAt: true, paidAmountCents: true, amountCents: true },
    }),
    prisma.financeEntry.findMany({
      where: { type: "receber", status: "pendente", dueDate: { lt: in30 } },
      include: { client: { select: { name: true, company: true } } },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),
    prisma.financeEntry.findMany({ where: { type: "pagar", status: "pendente", dueDate: { lt: in30 } }, orderBy: { dueDate: "asc" }, take: 8 }),
    prisma.contract.findMany({
      where: { status: { in: ["enviado", "visualizado"] } },
      include: { client: { select: { name: true, company: true } } },
      orderBy: { sentAt: "asc" },
      take: 6,
    }),
  ]);

  const paid = (type: string) => {
    const r = paidInMonth.find((g) => g.type === type);
    return r?._sum.paidAmountCents ?? r?._sum.amountCents ?? 0;
  };
  const due = (type: string) => dueInMonth.find((g) => g.type === type)?._sum.amountCents ?? 0;
  const late = (type: string) => overdue.find((g) => g.type === type);
  const received = paid("receber");
  const spent = paid("pagar");
  const result = received - spent;

  const months = Array.from({ length: 6 }, (_, i) => {
    const d = utcMonth(month.key, i - 5);
    const key = d.toISOString().slice(0, 7);
    const rows = history.filter((h) => h.paidAt?.toISOString().slice(0, 7) === key);
    const sum = (t: string) => rows.filter((r) => r.type === t).reduce((s, r) => s + (r.paidAmountCents ?? r.amountCents), 0);
    return { label: `${monthShort[d.getUTCMonth()]}/${String(d.getUTCFullYear()).slice(2)}`, income: sum("receber"), expense: sum("pagar") };
  });
  const maxIncome = Math.max(1, ...months.map((m) => m.income));

  return (
    <>
      <PageHeader
        title="Financeiro"
        subtitle="Recebimentos, pagamentos e o resultado do mês."
        actions={
          <>
            <Link href="/admin/financeiro/cobrancas/nova" className="adm-btn">
              + Cobrança
            </Link>
            <Link href="/admin/financeiro/despesas/nova" className="adm-btn ghost">
              + Despesa
            </Link>
            <nav className="adm-month" aria-label="Mês">
              <Link href={`/admin/financeiro?mes=${month.prev}`} aria-label="Mês anterior">
                ←
              </Link>
              <strong>{month.label}</strong>
              {month.next ? (
                <Link href={`/admin/financeiro?mes=${month.next}`} aria-label="Próximo mês">
                  →
                </Link>
              ) : (
                <span aria-hidden="true">→</span>
              )}
            </nav>
          </>
        }
      />

      <section className="adm-lead-kpis" aria-label="Resumo do mês">
        <div className="adm-kpi kpi-fechado">
          <span>Recebido no mês</span>
          <strong>{money(received)}</strong>
          <small>{money(due("receber"))} ainda a receber</small>
        </div>
        <div className="adm-kpi kpi-perdido">
          <span>Pago no mês</span>
          <strong>{money(spent)}</strong>
          <small>{money(due("pagar"))} ainda a pagar</small>
        </div>
        <div className="adm-kpi kpi-total">
          <span>Resultado do mês</span>
          <strong className={result < 0 ? "neg" : ""}>{money(result)}</strong>
          <small>Recebido − pago</small>
        </div>
        <Link href="/admin/financeiro/cobrancas?situacao=vencidos" className="adm-kpi kpi-novo">
          <span>Recebimentos vencidos</span>
          <strong>{money(late("receber")?._sum.amountCents ?? 0)}</strong>
          <small>{late("receber")?._count._all ?? 0} cobrança(s) em atraso</small>
        </Link>
        <Link href="/admin/financeiro/pagar?situacao=vencidos" className="adm-kpi kpi-contato">
          <span>Contas vencidas</span>
          <strong>{money(late("pagar")?._sum.amountCents ?? 0)}</strong>
          <small>{late("pagar")?._count._all ?? 0} conta(s) a pagar em atraso</small>
        </Link>
      </section>

      <div className="adm-grid-chart">
        <section className="adm-card">
          <h2>Últimos 6 meses</h2>
          <p className="adm-card-sub">Valores efetivamente recebidos e pagos.</p>
          <div className="adm-table-wrap">
            <table className="adm-table adm-table-keep">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Recebido</th>
                  <th className="num">Pago</th>
                  <th className="num">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {months.map((m) => (
                  <tr key={m.label}>
                    <td>{m.label}</td>
                    <td>
                      <div className="adm-inline-bar" title={`Recebido: ${money(m.income)}`}>
                        <span className="adm-bar-track">
                          {m.income > 0 && <span className="adm-bar" style={{ width: `${(m.income / maxIncome) * 100}%` }} />}
                        </span>
                        <b>{money(m.income)}</b>
                      </div>
                    </td>
                    <td className="num">{money(m.expense)}</td>
                    <td className={`num ${m.income - m.expense < 0 ? "neg" : ""}`}>{money(m.income - m.expense)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="adm-card">
          <div className="adm-card-head">
            <h2>Aguardando assinatura</h2>
            <Link href="/admin/contratos">Contratos →</Link>
          </div>
          {awaiting.length === 0 ? (
            <Empty title="Nenhum contrato pendente" />
          ) : (
            <ul className="adm-list compact">
              {awaiting.map((c) => (
                <li key={c.id}>
                  <Link href={`/admin/contratos/${c.id}`}>
                    <span>
                      <strong>{c.client.company ?? c.client.name}</strong>
                      <small>
                        {c.number} · {money(c.valueCents)}
                      </small>
                    </span>
                    <ContractBadge status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="adm-card-head">
            <h3 className="adm-h3">Integrações</h3>
            <Link href="/admin/financeiro/configuracoes">Configurar →</Link>
          </div>
          <ul className="adm-integrations">
            <li className={asaasConfigured() ? "ok" : ""}>
              <strong>Asaas</strong> {asaasConfigured() ? `conectado (${asaasEnvironment() === "production" ? "produção" : "sandbox de testes"})` : "não configurado"}
            </li>
            <li className={emailConfigured() ? "ok" : ""}>
              <strong>E-mail{emailConfigured() ? ` (${emailProvider()})` : ""}</strong> {emailConfigured() ? "conectado" : "não configurado"}
            </li>
          </ul>
        </section>
      </div>

      <div className="adm-grid-2">
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>A receber nos próximos 30 dias</h2>
            <Link href="/admin/financeiro/cobrancas">Ver todas →</Link>
          </div>
          {upcomingIn.length === 0 ? (
            <Empty title="Nada a receber nos próximos 30 dias" />
          ) : (
            <ul className="adm-list compact">
              {upcomingIn.map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/financeiro/lancamento/${e.id}`}>
                    <span>
                      <strong>{e.client ? (e.client.company ?? e.client.name) : e.description}</strong>
                      <small>
                        {money(e.amountCents)} · vence {shortDate(e.dueDate.toISOString().slice(0, 10))}
                      </small>
                    </span>
                    <EntryBadge status={e.status} dueDate={e.dueDate} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="adm-card">
          <div className="adm-card-head">
            <h2>A pagar nos próximos 30 dias</h2>
            <Link href="/admin/financeiro/pagar">Ver todos →</Link>
          </div>
          {upcomingOut.length === 0 ? (
            <Empty title="Nada a pagar nos próximos 30 dias" />
          ) : (
            <ul className="adm-list compact">
              {upcomingOut.map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/financeiro/lancamento/${e.id}`}>
                    <span>
                      <strong>{e.description}</strong>
                      <small>
                        {money(e.amountCents)} · vence {shortDate(e.dueDate.toISOString().slice(0, 10))}
                        {e.supplier ? ` · ${e.supplier}` : ""}
                      </small>
                    </span>
                    <EntryBadge status={e.status} dueDate={e.dueDate} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
