import Link from "next/link";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import BulkTable, { RowCheck, SelectAll } from "@/components/admin/BulkTable";
import { EntryBadge, InvoiceBadge } from "@/components/admin/Badges";
import { prisma, type Prisma } from "@/lib/prisma";
import { getAccess, requireAccess } from "@/lib/access";
import { money, shortDate } from "@/lib/admin/format";
import { parseMonth } from "@/lib/admin/month";
import { incomeCategories, labelOf, paymentMethods } from "@/lib/admin/options";
import { asaasConfigured } from "@/lib/integrations/asaas";
import { emailConfigured } from "@/lib/integrations/email";
import { bulkRow, isoDay, todayUtc } from "../shared";

export const metadata = { title: "Recebimentos" };

type Slice = { label: string; cents: number; count: number };

/** Lista de barras horizontais: uma série, cor da marca, valores em texto. */
function Breakdown({ title, rows, empty }: { title: string; rows: Slice[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.cents));
  const total = rows.reduce((s, r) => s + r.cents, 0);
  return (
    <section className="adm-card">
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className="adm-card-sub">{empty}</p>
      ) : (
        <ul className="adm-breakdown">
          {rows.map((r) => (
            <li key={r.label} title={`${r.label}: ${money(r.cents)} (${r.count})`}>
              <span className="adm-breakdown-label">
                <b>{r.label}</b>
                <small>
                  {r.count}× · {Math.round((r.cents / Math.max(1, total)) * 100)}%
                </small>
              </span>
              <span className="adm-bar-track">
                <span className="adm-bar" style={{ width: `${(r.cents / max) * 100}%` }} />
              </span>
              <strong>{money(r.cents)}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function group<T>(items: T[], key: (i: T) => string, cents: (i: T) => number): Slice[] {
  const map = new Map<string, Slice>();
  for (const i of items) {
    const k = key(i);
    const row = map.get(k) ?? { label: k, cents: 0, count: 0 };
    row.cents += cents(i);
    row.count++;
    map.set(k, row);
  }
  return [...map.values()].sort((a, b) => b.cents - a.cents);
}

export default async function ReceiptsPage({ searchParams }: { searchParams: Promise<{ mes?: string; ver?: string }> }) {
  await requireAccess("financeiro", 1);
  const financeLevel = (await getAccess())?.level("financeiro") ?? 1;
  const sp = await searchParams;
  const month = parseMonth(sp.mes);
  const tab = sp.ver === "pendentes" ? "pendentes" : "recebidos";
  const [y, m] = month.key.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  const today = todayUtc();

  const include = {
    client: { select: { name: true, company: true } },
    invoice: { select: { number: true, status: true } },
  } satisfies Prisma.FinanceEntryInclude;

  const [received, notReceived, plannedInMonth, overdueAll, accounts] = await Promise.all([
    prisma.financeEntry.findMany({ where: { type: "receber", status: "pago", paidAt: { gte: start, lt: end } }, include, orderBy: { paidAt: "desc" } }),
    // Não recebido: vence no mês e segue em aberto, mais o que ficou atrasado de meses anteriores.
    prisma.financeEntry.findMany({
      where: { type: "receber", status: "pendente", dueDate: { lt: end } },
      include,
      orderBy: { dueDate: "asc" },
      take: 500,
    }),
    prisma.financeEntry.aggregate({ where: { type: "receber", status: { not: "cancelado" }, dueDate: { gte: start, lt: end } }, _sum: { amountCents: true } }),
    prisma.financeEntry.aggregate({ where: { type: "receber", status: "pendente", dueDate: { lt: today } }, _sum: { amountCents: true }, _count: { _all: true } }),
    prisma.financeEntry.findMany({ where: { account: { not: null } }, distinct: ["account"], select: { account: true }, take: 30 }),
  ]);

  const paidValue = (e: { paidAmountCents: number | null; amountCents: number }) => e.paidAmountCents ?? e.amountCents;
  const totalReceived = received.reduce((s, e) => s + paidValue(e), 0);
  const planned = plannedInMonth._sum.amountCents ?? 0;
  const onTime = received.filter((e) => e.paidAt && e.paidAt <= e.dueDate).length;
  const average = received.length ? Math.round(totalReceived / received.length) : 0;
  const rate = planned ? Math.min(100, Math.round((totalReceived / planned) * 100)) : null;

  const byMethod = group(received, (e) => (e.method ? labelOf(paymentMethods, e.method) : "Não informado"), paidValue);
  const byAccount = group(received, (e) => e.account ?? "Não informada", paidValue);
  const byKind = group(received, (e) => e.category, paidValue);

  const rows = tab === "recebidos" ? received : notReceived;
  const base = `/admin/financeiro/recebimentos`;
  const q = (changes: Record<string, string>) => `${base}?${new URLSearchParams({ mes: month.key, ver: tab, ...changes })}`;

  return (
    <>
      <PageHeader
        title="Recebimentos"
        subtitle="O que entrou, o que não entrou e para onde foi o dinheiro."
        back={{ href: "/admin/financeiro", label: "Financeiro" }}
        actions={
          <nav className="adm-month" aria-label="Mês">
            <Link href={q({ mes: month.prev })} aria-label="Mês anterior">
              ←
            </Link>
            <strong>{month.label}</strong>
            {month.next ? (
              <Link href={q({ mes: month.next })} aria-label="Próximo mês">
                →
              </Link>
            ) : (
              <span aria-hidden="true">→</span>
            )}
          </nav>
        }
      />

      <section className="adm-lead-kpis" aria-label="Métricas do mês">
        <div className="adm-kpi kpi-fechado">
          <span>Recebido no mês</span>
          <strong>{money(totalReceived)}</strong>
          <small>{received.length} pagamento(s)</small>
        </div>
        <div className="adm-kpi kpi-total">
          <span>Previsto no mês</span>
          <strong>{money(planned)}</strong>
          <small>{rate === null ? "Nada previsto" : `${rate}% já recebido`}</small>
        </div>
        <Link href={q({ ver: "pendentes" })} className="adm-kpi kpi-perdido">
          <span>Em atraso</span>
          <strong>{money(overdueAll._sum.amountCents)}</strong>
          <small>{overdueAll._count._all} cobrança(s) vencida(s)</small>
        </Link>
        <div className="adm-kpi kpi-contato">
          <span>Ticket médio</span>
          <strong>{money(average)}</strong>
          <small>Por pagamento recebido</small>
        </div>
        <div className="adm-kpi kpi-novo">
          <span>Pago em dia</span>
          <strong>{received.length ? `${Math.round((onTime / received.length) * 100)}%` : "—"}</strong>
          <small>
            {onTime} de {received.length} até o vencimento
          </small>
        </div>
      </section>

      <div className="adm-grid-3">
        <Breakdown title="Por forma de pagamento" rows={byMethod} empty="Nenhum recebimento no mês." />
        <Breakdown title="Para onde foi (conta)" rows={byAccount} empty="Nenhum recebimento no mês." />
        <Breakdown title="Por tipo de serviço" rows={byKind} empty="Nenhum recebimento no mês." />
      </div>

      <nav className="adm-tabs" aria-label="Lista">
        <Link href={q({ ver: "recebidos" })} className={tab === "recebidos" ? "active" : ""}>
          Recebidos <span>{received.length}</span>
        </Link>
        <Link href={q({ ver: "pendentes" })} className={tab === "pendentes" ? "active" : ""}>
          Não recebidos <span>{notReceived.length}</span>
        </Link>
      </nav>

      <BulkTable
        level={financeLevel}
        empty={<Empty title={tab === "recebidos" ? "Nenhum recebimento neste mês" : "Nada pendente até este mês 🎉"} />}
        scope="entries"
        rows={rows.map(bulkRow)}
        actions={
          tab === "recebidos"
            ? ["editar", "reabrir", "excluir"]
            : ["baixa", ...(asaasConfigured() ? (["cobrar"] as const) : []), ...(emailConfigured() ? (["email"] as const) : []), "editar", "cancelar"]
        }
        title={`${tab === "recebidos" ? "Recebimentos" : "Não recebidos"} — ${month.label}`}
        hrefBase="/admin/financeiro/lancamento"
        categories={[...incomeCategories]}
        accounts={accounts.map((a) => a.account!).filter(Boolean)}
      >
        <div className="adm-table-wrap adm-card flush">
          <table className="adm-table adm-table-select">
            <thead>
              <tr>
                <th>
                  <span className="adm-check-head">
                    <SelectAll /> Descrição
                  </span>
                </th>
                <th>Cliente</th>
                <th>{tab === "recebidos" ? "Recebido em" : "Vencimento"}</th>
                <th className="num">Valor</th>
                <th>{tab === "recebidos" ? "Forma · conta" : "Situação"}</th>
                <th>Nota fiscal</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td>
                    <div className="adm-check-cell">
                      <RowCheck id={e.id} label={e.description} />
                      <Link href={`/admin/financeiro/lancamento/${e.id}`} className="adm-row-link">
                        <strong>{e.description}</strong>
                        <small>{e.category}</small>
                      </Link>
                    </div>
                  </td>
                  <td>{e.client ? (e.client.company ?? e.client.name) : "—"}</td>
                  <td>
                    {tab === "recebidos" ? shortDate(isoDay(e.paidAt)) : shortDate(isoDay(e.dueDate))}
                    {tab === "recebidos" && e.paidAt && e.paidAt > e.dueDate && <small className="adm-sub">venceu {shortDate(isoDay(e.dueDate))}</small>}
                  </td>
                  <td className="num">{money(tab === "recebidos" ? paidValue(e) : e.amountCents)}</td>
                  <td>
                    {tab === "recebidos" ? (
                      <>
                        {e.method ? labelOf(paymentMethods, e.method) : "—"}
                        {e.account && <small className="adm-sub">{e.account}</small>}
                      </>
                    ) : (
                      <EntryBadge status={e.status} dueDate={e.dueDate} />
                    )}
                  </td>
                  <td>{e.invoice ? <InvoiceBadge status={e.invoice.status} number={e.invoice.number} /> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BulkTable>
    </>
  );
}
