import Link from "next/link";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import BulkTable, { RowCheck, SelectAll } from "@/components/admin/BulkTable";
import { EntryBadge } from "@/components/admin/Badges";
import { prisma } from "@/lib/prisma";
import { getAccess, requireAccess } from "@/lib/access";
import { money, shortDate } from "@/lib/admin/format";
import { expenseTypes, labelOf, paymentMethods } from "@/lib/admin/options";
import { monthlyCost, syncRecurringExpenses } from "@/lib/finance/expenses";
import { bulkRow, entryWhere, hrefWith, isoDay, todayUtc, views, type ListSearch } from "../shared";

export const metadata = { title: "Contas a pagar" };

const frequencyShort: Record<string, string> = { mensal: "Mensal", anual: "Anual", unica: "Única" };

export default async function PayablesPage({ searchParams }: { searchParams: Promise<ListSearch> }) {
  await requireAccess("financeiro", 1);
  const financeLevel = (await getAccess())?.level("financeiro") ?? 1;
  await syncRecurringExpenses();
  const sp = await searchParams;
  const { where, view, month, q } = entryWhere("pagar", sp);
  const today = todayUtc();
  const monthEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1));

  const [entries, thisMonth, late, fixed, accounts] = await Promise.all([
    prisma.financeEntry.findMany({
      where,
      include: { expense: { select: { id: true, frequency: true } } },
      orderBy: view === "pagos" ? { paidAt: "desc" } : { dueDate: "asc" },
      take: 500,
    }),
    prisma.financeEntry.aggregate({ where: { type: "pagar", status: "pendente", dueDate: { lt: monthEnd } }, _sum: { amountCents: true }, _count: { _all: true } }),
    prisma.financeEntry.aggregate({ where: { type: "pagar", status: "pendente", dueDate: { lt: today } }, _sum: { amountCents: true }, _count: { _all: true } }),
    prisma.expense.findMany({ where: { active: true }, select: { frequency: true, amountCents: true } }),
    prisma.financeEntry.findMany({ where: { account: { not: null } }, distinct: ["account"], select: { account: true }, take: 30 }),
  ]);
  const total = entries.reduce((s, e) => s + e.amountCents, 0);
  const fixedMonthly = fixed.reduce((s, e) => s + monthlyCost(e), 0);
  const current = { situacao: view, mes: month, q };

  return (
    <>
      <PageHeader
        title="Contas a pagar"
        subtitle="Os vencimentos das despesas. As mensais e anuais entram aqui sozinhas."
        back={{ href: "/admin/financeiro", label: "Financeiro" }}
        actions={
          <>
            <Link href="/admin/financeiro/despesas" className="adm-btn ghost">
              Despesas cadastradas
            </Link>
            <Link href="/admin/financeiro/despesas/nova" className="adm-btn">
              + Nova despesa
            </Link>
          </>
        }
      />

      <section className="adm-lead-kpis adm-kpis-3" aria-label="Resumo">
        <Link href="/admin/financeiro/pagar?situacao=abertos" className="adm-kpi kpi-total">
          <span>A pagar até o fim do mês</span>
          <strong>{money(thisMonth._sum.amountCents)}</strong>
          <small>{thisMonth._count._all} conta(s) em aberto</small>
        </Link>
        <Link href="/admin/financeiro/pagar?situacao=vencidos" className="adm-kpi kpi-perdido">
          <span>Vencidas</span>
          <strong>{money(late._sum.amountCents)}</strong>
          <small>{late._count._all} conta(s) em atraso</small>
        </Link>
        <Link href="/admin/financeiro/despesas" className="adm-kpi kpi-contato">
          <span>Custo fixo mensal</span>
          <strong>{money(fixedMonthly)}</strong>
          <small>Mensais + anuais ÷ 12</small>
        </Link>
      </section>

      <nav className="adm-tabs" aria-label="Situação">
        {views.map((v) => (
          <Link key={v.value} href={hrefWith("/admin/financeiro/pagar", current, { situacao: v.value })} className={view === v.value ? "active" : ""}>
            {v.label}
          </Link>
        ))}
      </nav>
      <form className="adm-filters" method="get">
        <input type="hidden" name="situacao" value={view} />
        <input name="q" placeholder="Buscar por despesa, tipo ou fornecedor" defaultValue={q} />
        <input name="mes" type="month" defaultValue={month ?? ""} aria-label="Mês de vencimento" />
        <button type="submit" className="adm-btn ghost">
          Filtrar
        </button>
      </form>

      <BulkTable
        level={financeLevel}
        empty={<Empty title="Nada por aqui">{view === "vencidos" ? "Nenhuma conta vencida. 🎉" : "Nenhuma conta com esses filtros."}</Empty>}
        scope="entries"
        rows={entries.map(bulkRow)}
        actions={["baixa", "editar", "reabrir", "cancelar", "excluir"]}
        title={`Contas a pagar — ${entries.length} item(ns), ${money(total)}`}
        hrefBase="/admin/financeiro/lancamento"
        categories={expenseTypes.map((t) => t.label)}
        accounts={accounts.map((a) => a.account!).filter(Boolean)}
      >
        <div className="adm-table-wrap adm-card flush">
          <table className="adm-table adm-table-select">
            <thead>
              <tr>
                <th>
                  <span className="adm-check-head">
                    <SelectAll /> Despesa
                  </span>
                </th>
                <th>Fornecedor</th>
                <th>Vencimento</th>
                <th className="num">Valor</th>
                <th>Situação</th>
                <th>Pagamento</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="adm-check-cell">
                      <RowCheck id={e.id} label={e.description} />
                      <Link href={`/admin/financeiro/lancamento/${e.id}`} className="adm-row-link">
                        <strong>{e.description}</strong>
                        <small>
                          {e.category}
                          {e.expense && ` · ${frequencyShort[e.expense.frequency] ?? ""}`}
                        </small>
                      </Link>
                    </div>
                  </td>
                  <td>{e.supplier ?? "—"}</td>
                  <td>
                    {shortDate(isoDay(e.dueDate))}
                    {e.paidAt && <small className="adm-sub">Pago {shortDate(isoDay(e.paidAt))}</small>}
                  </td>
                  <td className="num">{money(e.status === "pago" ? (e.paidAmountCents ?? e.amountCents) : e.amountCents)}</td>
                  <td>
                    <EntryBadge status={e.status} dueDate={e.dueDate} />
                  </td>
                  <td>
                    {e.method ? labelOf(paymentMethods, e.method) : "—"}
                    {e.account && <small className="adm-sub">{e.account}</small>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BulkTable>
    </>
  );
}
