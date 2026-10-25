import Link from "next/link";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import BulkTable, { RowCheck, SelectAll } from "@/components/admin/BulkTable";
import { prisma, type Prisma } from "@/lib/prisma";
import { getAccess, requireAccess } from "@/lib/access";
import { money, shortDate } from "@/lib/admin/format";
import { expenseTypes, labelOf, paymentMethods } from "@/lib/admin/options";
import { monthlyCost, nextDueDate, scheduleLabel, syncRecurringExpenses } from "@/lib/finance/expenses";

export const metadata = { title: "Despesas" };

const tabs = [
  { value: "ativas", label: "Ativas" },
  { value: "encerradas", label: "Encerradas" },
  { value: "todas", label: "Todas" },
] as const;

const groups: string[] = [...new Set(expenseTypes.map((t) => t.group))];

export default async function ExpensesPage({ searchParams }: { searchParams: Promise<{ ver?: string; grupo?: string; q?: string }> }) {
  await requireAccess("financeiro", 1);
  const financeLevel = (await getAccess())?.level("financeiro") ?? 1;
  await syncRecurringExpenses();
  const sp = await searchParams;
  const tab = tabs.find((t) => t.value === sp.ver)?.value ?? "ativas";
  const group = groups.includes(sp.grupo ?? "") ? sp.grupo! : null;
  const q = sp.q?.trim();

  const where: Prisma.ExpenseWhereInput = {};
  if (tab === "ativas") where.active = true;
  if (tab === "encerradas") where.active = false;
  if (group) where.kind = { in: expenseTypes.filter((t) => t.group === group).map((t) => t.value) };
  if (q) {
    const like = { contains: q, mode: "insensitive" as const };
    where.OR = [{ name: like }, { supplier: like }, { notes: like }];
  }

  const [expenses, active] = await Promise.all([
    prisma.expense.findMany({ where, orderBy: [{ active: "desc" }, { amountCents: "desc" }] }),
    prisma.expense.findMany({ where: { active: true }, select: { kind: true, frequency: true, amountCents: true } }),
  ]);

  const fixedMonthly = active.reduce((s, e) => s + monthlyCost(e), 0);
  const yearly = active.reduce((s, e) => s + (e.frequency === "mensal" ? e.amountCents * 12 : e.frequency === "anual" ? e.amountCents : 0), 0);
  const byGroup = groups
    .map((g) => ({
      label: g,
      cents: active.filter((e) => expenseTypes.find((t) => t.value === e.kind)?.group === g).reduce((s, e) => s + monthlyCost(e), 0),
    }))
    .filter((g) => g.cents > 0)
    .sort((a, b) => b.cents - a.cents);
  const max = Math.max(1, ...byGroup.map((g) => g.cents));
  const href = (changes: Record<string, string | undefined>) => {
    const next = { ver: tab, grupo: group ?? undefined, q, ...changes };
    const s = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => Boolean(e[1]))).toString();
    return `/admin/financeiro/despesas${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Despesas"
        subtitle="Ferramentas, IA, hospedagem, servidores… Cadastre uma vez; os vencimentos entram em contas a pagar."
        back={{ href: "/admin/financeiro", label: "Financeiro" }}
        actions={
          <>
            <Link href="/admin/financeiro/pagar" className="adm-btn ghost">
              Contas a pagar
            </Link>
            <Link href="/admin/financeiro/despesas/nova" className="adm-btn">
              + Nova despesa
            </Link>
          </>
        }
      />

      <div className="adm-grid-chart">
        <section className="adm-lead-kpis adm-kpis-2x2" aria-label="Custos">
          <div className="adm-kpi kpi-total">
            <span>Custo fixo mensal</span>
            <strong>{money(fixedMonthly)}</strong>
            <small>Mensais + anuais ÷ 12</small>
          </div>
          <div className="adm-kpi kpi-perdido">
            <span>Custo no ano</span>
            <strong>{money(yearly)}</strong>
            <small>Mensais × 12 + anuais</small>
          </div>
          <div className="adm-kpi kpi-contato">
            <span>Despesas ativas</span>
            <strong>{active.length}</strong>
            <small>
              {active.filter((e) => e.frequency === "mensal").length} mensais · {active.filter((e) => e.frequency === "anual").length} anuais
            </small>
          </div>
          <div className="adm-kpi kpi-novo">
            <span>Maior grupo</span>
            <strong className="adm-kpi-text">{byGroup[0]?.label ?? "—"}</strong>
            <small>{byGroup[0] ? `${money(byGroup[0].cents)}/mês` : "Nada cadastrado"}</small>
          </div>
        </section>
        <section className="adm-card">
          <h2>Custo mensal por grupo</h2>
          {byGroup.length === 0 ? (
            <p className="adm-card-sub">Cadastre as despesas recorrentes para ver para onde vai o dinheiro.</p>
          ) : (
            <ul className="adm-breakdown">
              {byGroup.map((g) => (
                <li key={g.label}>
                  <span className="adm-breakdown-label">
                    <Link href={href({ grupo: g.label })}>
                      <b>{g.label}</b>
                    </Link>
                    <small>{Math.round((g.cents / Math.max(1, fixedMonthly)) * 100)}%</small>
                  </span>
                  <span className="adm-bar-track">
                    <span className="adm-bar" style={{ width: `${(g.cents / max) * 100}%` }} />
                  </span>
                  <strong>{money(g.cents)}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <nav className="adm-tabs" aria-label="Situação">
        {tabs.map((t) => (
          <Link key={t.value} href={href({ ver: t.value })} className={tab === t.value ? "active" : ""}>
            {t.label}
          </Link>
        ))}
      </nav>
      <form className="adm-filters" method="get">
        <input type="hidden" name="ver" value={tab} />
        <input name="q" placeholder="Buscar por nome ou fornecedor" defaultValue={q} />
        <select name="grupo" defaultValue={group ?? ""} aria-label="Grupo">
          <option value="">Todos os grupos</option>
          {groups.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <button type="submit" className="adm-btn ghost">
          Filtrar
        </button>
      </form>

      <BulkTable
        level={financeLevel}
        empty={
          <Empty title="Nenhuma despesa aqui">
            <Link href="/admin/financeiro/despesas/nova">Cadastre a primeira despesa</Link> — por exemplo, a hospedagem ou a assinatura de IA.
          </Empty>
        }
        scope="expenses"
        rows={expenses.map((e) => {
          const next = nextDueDate(e);
          return {
            id: e.id,
            csv: {
              Despesa: e.name,
              Tipo: labelOf(expenseTypes, e.kind),
              Fornecedor: e.supplier ?? "",
              Periodicidade: scheduleLabel(e),
              Valor: (e.amountCents / 100).toFixed(2).replace(".", ","),
              "Custo mensal": (monthlyCost(e) / 100).toFixed(2).replace(".", ","),
              "Próximo vencimento": next ? next.split("-").reverse().join("/") : "",
              "Forma de pagamento": e.method ? labelOf(paymentMethods, e.method) : "",
              Conta: e.account ?? "",
              Situação: e.active ? "Ativa" : "Encerrada",
            },
            share: `${e.name} · ${labelOf(expenseTypes, e.kind)} · ${money(e.amountCents)} · ${scheduleLabel(e)}`,
          };
        })}
        actions={tab === "encerradas" ? ["reativar", "excluir"] : tab === "ativas" ? ["encerrar", "excluir"] : ["reativar", "encerrar", "excluir"]}
        title="Despesas Gardsoft"
        hrefBase="/admin/financeiro/despesas"
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
                <th>Periodicidade</th>
                <th className="num">Valor</th>
                <th className="num">Por mês</th>
                <th>Próximo vencimento</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((e) => {
                const next = nextDueDate(e);
                return (
                  <tr key={e.id} className={e.active ? "" : "is-muted"}>
                    <td>
                      <div className="adm-check-cell">
                        <RowCheck id={e.id} label={e.name} />
                        <Link href={`/admin/financeiro/despesas/${e.id}`} className="adm-row-link">
                          <strong>{e.name}</strong>
                          <small>{labelOf(expenseTypes, e.kind)}</small>
                        </Link>
                      </div>
                    </td>
                    <td>{e.supplier ?? "—"}</td>
                    <td>
                      {scheduleLabel(e)}
                      {!e.active && <small className="adm-sub">Encerrada</small>}
                    </td>
                    <td className="num">{money(e.amountCents)}</td>
                    <td className="num">{e.frequency === "unica" ? "—" : money(monthlyCost(e))}</td>
                    <td>{next ? shortDate(next) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </BulkTable>
    </>
  );
}
