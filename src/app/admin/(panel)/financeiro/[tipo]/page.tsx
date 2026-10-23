import Link from "next/link";
import { notFound } from "next/navigation";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import { EntryBadge } from "@/components/admin/Badges";
import { prisma, type Prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { money, shortDate } from "@/lib/admin/format";
import { labelOf, paymentMethods } from "@/lib/admin/options";

type Search = { situacao?: string; mes?: string; q?: string };

const views = [
  { value: "abertos", label: "Em aberto" },
  { value: "vencidos", label: "Vencidos" },
  { value: "pagos", label: "Pagos" },
  { value: "todos", label: "Todos" },
] as const;

export async function generateMetadata({ params }: { params: Promise<{ tipo: string }> }) {
  const { tipo } = await params;
  return { title: tipo === "pagar" ? "Contas a pagar" : "Contas a receber" };
}

export default async function EntriesPage({ params, searchParams }: { params: Promise<{ tipo: string }>; searchParams: Promise<Search> }) {
  await requireUser();
  const [{ tipo }, sp] = await Promise.all([params, searchParams]);
  if (tipo !== "receber" && tipo !== "pagar") notFound();
  const view = views.find((v) => v.value === sp.situacao)?.value ?? "abertos";
  // Mês de vencimento (aceita meses futuros).
  const month = sp.mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(sp.mes) ? sp.mes : null;
  const today = new Date(`${new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10)}T00:00:00Z`);

  const base: Prisma.FinanceEntryWhereInput = { type: tipo };
  if (month) {
    const [y, m] = month.split("-").map(Number);
    base.dueDate = { gte: new Date(Date.UTC(y, m - 1, 1)), lt: new Date(Date.UTC(y, m, 1)) };
  }
  const q = sp.q?.trim();
  if (q) {
    const like = { contains: q, mode: "insensitive" as const };
    base.OR = [{ description: like }, { supplier: like }, { client: { name: like } }, { client: { company: like } }];
  }
  const where: Prisma.FinanceEntryWhereInput =
    view === "abertos"
      ? { ...base, status: "pendente" }
      : view === "vencidos"
        ? { ...base, status: "pendente", dueDate: { lt: today } }
        : view === "pagos"
          ? { ...base, status: "pago" }
          : base;

  const entries = await prisma.financeEntry.findMany({
    where,
    include: { client: { select: { name: true, company: true } }, _count: { select: { files: true } } },
    orderBy: view === "pagos" ? { paidAt: "desc" } : { dueDate: "asc" },
    take: 500,
  });
  const total = entries.reduce((s, e) => s + (e.status === "pago" ? (e.paidAmountCents ?? e.amountCents) : e.amountCents), 0);
  const isIncome = tipo === "receber";
  const href = (changes: Partial<Search>) => {
    const next = { situacao: view, mes: month ?? undefined, q, ...changes };
    const s = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => Boolean(e[1]))).toString();
    return `/admin/financeiro/${tipo}${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title={isIncome ? "Contas a receber" : "Contas a pagar"}
        subtitle={`${entries.length} lançamento${entries.length === 1 ? "" : "s"} · ${money(total)}`}
        back={{ href: "/admin/financeiro", label: "Financeiro" }}
        actions={
          <Link href={`/admin/financeiro/lancamento/novo?tipo=${tipo}`} className="adm-btn">
            + {isIncome ? "Nova conta a receber" : "Nova conta a pagar"}
          </Link>
        }
      />
      <nav className="adm-tabs" aria-label="Situação">
        {views.map((v) => (
          <Link key={v.value} href={href({ situacao: v.value })} className={view === v.value ? "active" : ""}>
            {v.label}
          </Link>
        ))}
      </nav>
      <form className="adm-filters" method="get">
        <input type="hidden" name="situacao" value={view} />
        <input name="q" placeholder={isIncome ? "Buscar por descrição ou cliente" : "Buscar por descrição ou fornecedor"} defaultValue={q} />
        <input name="mes" type="month" defaultValue={month ?? ""} aria-label="Mês de vencimento" />
        <button type="submit" className="adm-btn ghost">
          Filtrar
        </button>
      </form>
      {entries.length === 0 ? (
        <Empty title="Nada por aqui">{view === "vencidos" ? "Nenhuma conta vencida. 🎉" : "Nenhum lançamento com esses filtros."}</Empty>
      ) : (
        <div className="adm-table-wrap adm-card flush">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>{isIncome ? "Cliente" : "Fornecedor"}</th>
                <th>Vencimento</th>
                <th className="num">Valor</th>
                <th>Situação</th>
                <th>Cobrança / NF</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>
                    <Link href={`/admin/financeiro/lancamento/${e.id}`} className="adm-row-link">
                      <strong>{e.description}</strong>
                      <small>
                        {e.category}
                        {e._count.files > 0 && ` · 📎 ${e._count.files}`}
                      </small>
                    </Link>
                  </td>
                  <td>{isIncome ? (e.client ? (e.client.company ?? e.client.name) : "—") : (e.supplier ?? "—")}</td>
                  <td>
                    {shortDate(e.dueDate.toISOString().slice(0, 10))}
                    {e.paidAt && <small className="adm-sub">Pago {shortDate(e.paidAt.toISOString().slice(0, 10))}</small>}
                  </td>
                  <td className="num">
                    {money(e.amountCents)}
                    {e.method && <small className="adm-sub">{labelOf(paymentMethods, e.method)}</small>}
                  </td>
                  <td>
                    <EntryBadge status={e.status} dueDate={e.dueDate} />
                  </td>
                  <td>
                    {e.asaasPaymentId ? <span className="adm-badge">Asaas</span> : "—"}
                    {e.nfStatus && <span className={`adm-badge nf-${e.nfStatus}`}>NF {e.nfNumber ?? e.nfStatus.toLowerCase()}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
