import Link from "next/link";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import BulkTable, { RowCheck, SelectAll } from "@/components/admin/BulkTable";
import { EntryBadge } from "@/components/admin/Badges";
import { prisma } from "@/lib/prisma";
import { getAccess, requireAccess } from "@/lib/access";
import { money, shortDate } from "@/lib/admin/format";
import { incomeCategories } from "@/lib/admin/options";
import { asaasConfigured } from "@/lib/integrations/asaas";
import { emailConfigured } from "@/lib/integrations/email";
import { bulkRow, entryWhere, hrefWith, isoDay, todayUtc, views, type ListSearch } from "../shared";

export const metadata = { title: "Cobranças" };

export default async function ChargesPage({ searchParams }: { searchParams: Promise<ListSearch> }) {
  await requireAccess("financeiro", 1);
  const financeLevel = (await getAccess())?.level("financeiro") ?? 1;
  const sp = await searchParams;
  const { where, view, month, q } = entryWhere("receber", sp);
  const today = todayUtc();
  const in7 = new Date(today.getTime() + 7 * 864e5);

  const [entries, open, late, soon, accounts] = await Promise.all([
    prisma.financeEntry.findMany({
      where,
      include: { client: { select: { name: true, company: true, email: true } } },
      orderBy: view === "pagos" ? { paidAt: "desc" } : { dueDate: "asc" },
      take: 500,
    }),
    prisma.financeEntry.aggregate({ where: { type: "receber", status: "pendente" }, _sum: { amountCents: true }, _count: { _all: true } }),
    prisma.financeEntry.aggregate({ where: { type: "receber", status: "pendente", dueDate: { lt: today } }, _sum: { amountCents: true }, _count: { _all: true } }),
    prisma.financeEntry.aggregate({ where: { type: "receber", status: "pendente", dueDate: { gte: today, lt: in7 } }, _sum: { amountCents: true }, _count: { _all: true } }),
    prisma.financeEntry.findMany({ where: { account: { not: null } }, distinct: ["account"], select: { account: true }, take: 30 }),
  ]);
  const total = entries.reduce((s, e) => s + e.amountCents, 0);
  const current = { situacao: view, mes: month, q };
  const actions = [
    "baixa",
    ...(asaasConfigured() ? (["cobrar"] as const) : []),
    ...(emailConfigured() ? (["email"] as const) : []),
    "editar",
    "reabrir",
    "cancelar",
    "excluir",
  ] as const;

  return (
    <>
      <PageHeader
        title="Cobranças"
        subtitle="O que você precisa cobrar: projetos, manutenções, hospedagens."
        back={{ href: "/admin/financeiro", label: "Financeiro" }}
        actions={
          <Link href="/admin/financeiro/cobrancas/nova" className="adm-btn">
            + Nova cobrança
          </Link>
        }
      />
      {sp.aviso && <p className="adm-alert">A cobrança foi lançada, mas o boleto/e-mail falhou: {sp.aviso}</p>}

      <section className="adm-lead-kpis adm-kpis-3" aria-label="Resumo das cobranças">
        <Link href="/admin/financeiro/cobrancas?situacao=abertos" className="adm-kpi kpi-total">
          <span>Em aberto</span>
          <strong>{money(open._sum.amountCents)}</strong>
          <small>{open._count._all} cobrança(s) aguardando pagamento</small>
        </Link>
        <Link href="/admin/financeiro/cobrancas?situacao=vencidos" className="adm-kpi kpi-perdido">
          <span>Vencidas</span>
          <strong>{money(late._sum.amountCents)}</strong>
          <small>{late._count._all} em atraso</small>
        </Link>
        <div className="adm-kpi kpi-contato">
          <span>Vencem em 7 dias</span>
          <strong>{money(soon._sum.amountCents)}</strong>
          <small>{soon._count._all} cobrança(s)</small>
        </div>
      </section>

      <nav className="adm-tabs" aria-label="Situação">
        {views.map((v) => (
          <Link key={v.value} href={hrefWith("/admin/financeiro/cobrancas", current, { situacao: v.value })} className={view === v.value ? "active" : ""}>
            {v.value === "pagos" ? "Recebidas" : v.label}
          </Link>
        ))}
      </nav>
      <form className="adm-filters" method="get">
        <input type="hidden" name="situacao" value={view} />
        <input name="q" placeholder="Buscar por descrição, cliente ou tipo" defaultValue={q} />
        <input name="mes" type="month" defaultValue={month ?? ""} aria-label="Mês de vencimento" />
        <button type="submit" className="adm-btn ghost">
          Filtrar
        </button>
      </form>

      <BulkTable
        level={financeLevel}
        empty={<Empty title="Nada por aqui">{view === "vencidos" ? "Nenhuma cobrança vencida. 🎉" : "Nenhuma cobrança com esses filtros."}</Empty>}
        scope="entries"
        rows={entries.map(bulkRow)}
        actions={[...actions]}
        title={`Cobranças Gardsoft — ${entries.length} item(ns), ${money(total)}`}
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
                    <SelectAll /> Cobrança
                  </span>
                </th>
                <th>Cliente</th>
                <th>Vencimento</th>
                <th className="num">Valor</th>
                <th>Situação</th>
                <th>Boleto / Pix</th>
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
                          {e.installmentTotal ? ` · parcela ${e.installmentNumber}/${e.installmentTotal}` : ""}
                        </small>
                      </Link>
                    </div>
                  </td>
                  <td>
                    {e.client ? (e.client.company ?? e.client.name) : "—"}
                    {e.client && !e.client.email && <small className="adm-sub">sem e-mail</small>}
                  </td>
                  <td>
                    {shortDate(isoDay(e.dueDate))}
                    {e.paidAt && <small className="adm-sub">Recebido {shortDate(isoDay(e.paidAt))}</small>}
                  </td>
                  <td className="num">{money(e.amountCents)}</td>
                  <td>
                    <EntryBadge status={e.status} dueDate={e.dueDate} />
                  </td>
                  <td>
                    {e.invoiceUrl ? (
                      <a href={e.invoiceUrl} target="_blank" rel="noopener noreferrer">
                        Fatura ↗
                      </a>
                    ) : e.asaasPaymentId ? (
                      <span className="adm-badge">Asaas</span>
                    ) : (
                      <span className="adm-sub">Não gerado</span>
                    )}
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
