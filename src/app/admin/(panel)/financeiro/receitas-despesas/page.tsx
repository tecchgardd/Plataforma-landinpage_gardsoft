import Link from "next/link";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { money } from "@/lib/admin/format";
import { parseMonth } from "@/lib/admin/month";

export const metadata = { title: "Receitas e despesas" };

type Row = { category: string; done: number; planned: number };

/** Agrupa por categoria: realizado (pago no mês) e previsto (pendente com vencimento no mês). */
function byCategory(
  paid: { category: string; _sum: { paidAmountCents: number | null; amountCents: number | null } }[],
  pending: { category: string; _sum: { amountCents: number | null } }[],
) {
  const map = new Map<string, Row>();
  for (const p of paid) map.set(p.category, { category: p.category, done: p._sum.paidAmountCents ?? p._sum.amountCents ?? 0, planned: 0 });
  for (const p of pending) {
    const row = map.get(p.category) ?? { category: p.category, done: 0, planned: 0 };
    row.planned = p._sum.amountCents ?? 0;
    map.set(p.category, row);
  }
  return [...map.values()].sort((a, b) => b.done + b.planned - (a.done + a.planned));
}

function CategoryTable({ title, rows, tipo, mes }: { title: string; rows: Row[]; tipo: "receber" | "pagar"; mes: string }) {
  const done = rows.reduce((s, r) => s + r.done, 0);
  const planned = rows.reduce((s, r) => s + r.planned, 0);
  const max = Math.max(1, ...rows.map((r) => r.done + r.planned));
  return (
    <section className="adm-card">
      <div className="adm-card-head">
        <h2>{title}</h2>
        <Link href={`/admin/financeiro/${tipo}?mes=${mes}&situacao=todos`}>Ver lançamentos →</Link>
      </div>
      {rows.length === 0 ? (
        <Empty title="Nada lançado neste mês" />
      ) : (
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th className="num">{tipo === "receber" ? "Recebido" : "Pago"}</th>
                <th className="num">Previsto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.category}>
                  <td>
                    <div className="adm-inline-bar" title={`${r.category}: ${money(r.done + r.planned)}`}>
                      <span className="adm-bar-track">
                        <span className={`adm-bar ${tipo === "pagar" ? "expense" : ""}`} style={{ width: `${((r.done + r.planned) / max) * 100}%` }} />
                      </span>
                      <b>{r.category}</b>
                    </div>
                  </td>
                  <td className="num">{money(r.done)}</td>
                  <td className="num">{r.planned ? money(r.planned) : "—"}</td>
                </tr>
              ))}
              <tr className="adm-total-row">
                <td>Total</td>
                <td className="num">{money(done)}</td>
                <td className="num">{planned ? money(planned) : "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function IncomeExpensePage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await requireUser();
  const month = parseMonth((await searchParams).mes);
  const [y, m] = month.key.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));

  const paidWhere = (type: string) => ({ type, status: "pago", paidAt: { gte: start, lt: end } });
  const pendingWhere = (type: string) => ({ type, status: "pendente", dueDate: { gte: start, lt: end } });
  const sums = { paidAmountCents: true, amountCents: true } as const;
  const [incomePaid, incomePending, expensePaid, expensePending] = await Promise.all([
    prisma.financeEntry.groupBy({ by: ["category"], where: paidWhere("receber"), _sum: sums }),
    prisma.financeEntry.groupBy({ by: ["category"], where: pendingWhere("receber"), _sum: { amountCents: true } }),
    prisma.financeEntry.groupBy({ by: ["category"], where: paidWhere("pagar"), _sum: sums }),
    prisma.financeEntry.groupBy({ by: ["category"], where: pendingWhere("pagar"), _sum: { amountCents: true } }),
  ]);
  const income = byCategory(incomePaid, incomePending);
  const expense = byCategory(expensePaid, expensePending);
  const total = (rows: Row[], key: "done" | "planned") => rows.reduce((s, r) => s + r[key], 0);
  const result = total(income, "done") - total(expense, "done");
  const forecast = result + total(income, "planned") - total(expense, "planned");

  return (
    <>
      <PageHeader
        title="Receitas e despesas"
        subtitle="O que entrou e saiu no mês, por categoria, e o que ainda está previsto."
        actions={
          <>
            <nav className="adm-month" aria-label="Mês">
              <Link href={`/admin/financeiro/receitas-despesas?mes=${month.prev}`} aria-label="Mês anterior">
                ←
              </Link>
              <strong>{month.label}</strong>
              {month.next ? (
                <Link href={`/admin/financeiro/receitas-despesas?mes=${month.next}`} aria-label="Próximo mês">
                  →
                </Link>
              ) : (
                <span aria-hidden="true">→</span>
              )}
            </nav>
            <Link href="/admin/financeiro/lancamento/novo?tipo=receber" className="adm-btn">
              + Receita
            </Link>
            <Link href="/admin/financeiro/lancamento/novo?tipo=pagar" className="adm-btn ghost">
              + Despesa
            </Link>
          </>
        }
      />
      <section className="adm-lead-kpis" aria-label="Resumo do mês">
        <div className="adm-kpi kpi-fechado">
          <span>Receitas</span>
          <strong>{money(total(income, "done"))}</strong>
          <small>{money(total(income, "planned"))} previstas</small>
        </div>
        <div className="adm-kpi kpi-perdido">
          <span>Despesas</span>
          <strong>{money(total(expense, "done"))}</strong>
          <small>{money(total(expense, "planned"))} previstas</small>
        </div>
        <div className="adm-kpi kpi-total">
          <span>Resultado</span>
          <strong className={result < 0 ? "neg" : ""}>{money(result)}</strong>
          <small>Receitas − despesas realizadas</small>
        </div>
        <div className="adm-kpi kpi-contato">
          <span>Resultado previsto</span>
          <strong className={forecast < 0 ? "neg" : ""}>{money(forecast)}</strong>
          <small>Se tudo for pago até o fim do mês</small>
        </div>
      </section>
      <div className="adm-grid-2">
        <CategoryTable title="Receitas por categoria" rows={income} tipo="receber" mes={month.key} />
        <CategoryTable title="Despesas por categoria" rows={expense} tipo="pagar" mes={month.key} />
      </div>
    </>
  );
}
