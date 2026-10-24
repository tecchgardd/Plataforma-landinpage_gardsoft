import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import ActionForm, { ConfirmButton } from "@/components/admin/ActionForm";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import BulkTable, { RowCheck, SelectAll } from "@/components/admin/BulkTable";
import { EntryBadge } from "@/components/admin/Badges";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { money, moneyInput, shortDate } from "@/lib/admin/format";
import { expenseTypes, labelOf, paymentMethods } from "@/lib/admin/options";
import { monthlyCost, nextDueDate, scheduleLabel, syncRecurringExpenses } from "@/lib/finance/expenses";
import { deleteExpense, saveExpense, toggleExpense } from "../../../../_actions/expenses";
import ExpenseFields from "../ExpenseFields";
import { bulkRow, isoDay } from "../../shared";

export const metadata = { title: "Despesa" };

export default async function ExpensePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ lancadas?: string }> }) {
  await requireUser();
  const [{ id }, { lancadas }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  await syncRecurringExpenses();
  const [expense, accounts] = await Promise.all([
    prisma.expense.findUnique({ where: { id }, include: { entries: { orderBy: { dueDate: "desc" }, take: 120 } } }),
    prisma.financeEntry.findMany({ where: { account: { not: null } }, distinct: ["account"], select: { account: true }, take: 30 }),
  ]);
  if (!expense) notFound();

  const next = nextDueDate(expense);
  const paid = expense.entries.filter((e) => e.status === "pago");
  const paidTotal = paid.reduce((s, e) => s + (e.paidAmountCents ?? e.amountCents), 0);
  const start = isoDay(expense.startDate);

  return (
    <>
      <PageHeader
        title={expense.name}
        subtitle={
          <>
            {labelOf(expenseTypes, expense.kind)} · {scheduleLabel(expense)} · {money(expense.amountCents)}
            {!expense.active && " · Encerrada"}
          </>
        }
        back={{ href: "/admin/financeiro/despesas", label: "Despesas" }}
      />
      {lancadas && Number(lancadas) > 0 && (
        <p className="adm-alert ok">
          Despesa cadastrada. {lancadas} vencimento(s) já estão em <Link href="/admin/financeiro/pagar">contas a pagar</Link>.
        </p>
      )}

      <div className="adm-detail">
        <div className="adm-modal-main">
          <section className="adm-lead-kpis adm-kpis-3" aria-label="Resumo">
            <div className="adm-kpi kpi-total">
              <span>Próximo vencimento</span>
              <strong className="adm-kpi-text">{next ? shortDate(next) : "—"}</strong>
              <small>{expense.active ? money(expense.amountCents) : "Despesa encerrada"}</small>
            </div>
            <div className="adm-kpi kpi-contato">
              <span>Custo por mês</span>
              <strong>{expense.frequency === "unica" ? "—" : money(monthlyCost(expense))}</strong>
              <small>{expense.frequency === "anual" ? "Valor anual ÷ 12" : expense.frequency === "mensal" ? "Todo mês" : "Despesa única"}</small>
            </div>
            <div className="adm-kpi kpi-fechado">
              <span>Já pago</span>
              <strong>{money(paidTotal)}</strong>
              <small>{paid.length} pagamento(s)</small>
            </div>
          </section>

          <section className="adm-card">
            <div className="adm-card-head">
              <h2>Vencimentos</h2>
              <Link href="/admin/financeiro/pagar">Contas a pagar →</Link>
            </div>
            <BulkTable
              empty={<Empty title="Nenhum vencimento lançado ainda" />}
              scope="entries"
              rows={expense.entries.map((e) => bulkRow(e))}
              actions={["baixa", "editar", "reabrir", "cancelar", "excluir"]}
              title={`${expense.name} — vencimentos`}
              hrefBase="/admin/financeiro/lancamento"
              accounts={accounts.map((a) => a.account!).filter(Boolean)}
            >
              <div className="adm-table-wrap">
                <table className="adm-table adm-table-select">
                  <thead>
                    <tr>
                      <th>
                        <span className="adm-check-head">
                          <SelectAll /> Vencimento
                        </span>
                      </th>
                      <th className="num">Valor</th>
                      <th>Situação</th>
                      <th>Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expense.entries.map((e) => (
                      <tr key={e.id}>
                        <td>
                          <div className="adm-check-cell">
                            <RowCheck id={e.id} label={`vencimento de ${shortDate(isoDay(e.dueDate))}`} />
                            <Link href={`/admin/financeiro/lancamento/${e.id}`} className="adm-row-link">
                              <strong>{shortDate(isoDay(e.dueDate))}</strong>
                              {e.paidAt && <small>Pago em {shortDate(isoDay(e.paidAt))}</small>}
                            </Link>
                          </div>
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
          </section>

          <details className="adm-card adm-modal-edit">
            <summary>Editar despesa</summary>
            <ActionForm action={saveExpense.bind(null, expense.id)} submitLabel="Salvar">
              <ExpenseFields
                accounts={accounts.map((a) => a.account!).filter(Boolean)}
                values={{
                  name: expense.name,
                  kind: expense.kind,
                  supplier: expense.supplier,
                  amount: moneyInput(expense.amountCents),
                  frequency: expense.frequency,
                  dueDay: expense.dueDay,
                  startMonth: start.slice(0, 7),
                  dueDate: next && expense.frequency === "anual" ? next : start,
                  endMonth: expense.endDate ? isoDay(expense.endDate).slice(0, 7) : "",
                  method: expense.method,
                  account: expense.account,
                  url: expense.url,
                  notes: expense.notes,
                }}
              />
            </ActionForm>
          </details>
        </div>

        <aside className="adm-side">
          <section className="adm-card">
            <h2>Detalhes</h2>
            <dl className="adm-dl">
              <dt>Tipo</dt>
              <dd>{labelOf(expenseTypes, expense.kind)}</dd>
              <dt>Fornecedor</dt>
              <dd>{expense.supplier ?? "—"}</dd>
              <dt>Periodicidade</dt>
              <dd>{scheduleLabel(expense)}</dd>
              <dt>Desde</dt>
              <dd>{shortDate(start)}</dd>
              {expense.endDate && (
                <>
                  <dt>Até</dt>
                  <dd>{shortDate(isoDay(expense.endDate))}</dd>
                </>
              )}
              <dt>Pagamento</dt>
              <dd>
                {expense.method ? labelOf(paymentMethods, expense.method) : "—"}
                {expense.account ? ` · ${expense.account}` : ""}
              </dd>
              {expense.url && (
                <>
                  <dt>Painel</dt>
                  <dd>
                    <a href={expense.url} target="_blank" rel="noopener noreferrer">
                      Abrir ↗
                    </a>
                  </dd>
                </>
              )}
            </dl>
            {expense.notes && <p className="adm-prewrap" style={{ marginTop: 12 }}>{expense.notes}</p>}
          </section>
          {expense.frequency !== "unica" &&
            (expense.active ? (
              <ConfirmButton
                action={toggleExpense.bind(null, expense.id, false)}
                confirm="Encerrar esta despesa? Os vencimentos em aberto de hoje em diante saem de contas a pagar."
                className="adm-btn ghost"
              >
                Encerrar despesa
              </ConfirmButton>
            ) : (
              <ConfirmButton action={toggleExpense.bind(null, expense.id, true)} confirm="Reativar esta despesa a partir de hoje?" className="adm-btn ghost">
                Reativar despesa
              </ConfirmButton>
            ))}
          <ConfirmButton
            action={deleteExpense.bind(null, expense.id)}
            confirm="Excluir esta despesa? Os vencimentos em aberto saem de contas a pagar; os já pagos continuam no histórico."
            className="adm-btn danger ghost"
          >
            Excluir
          </ConfirmButton>
        </aside>
      </div>
    </>
  );
}
