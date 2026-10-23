import Link from "next/link";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import { InvoiceBadge } from "@/components/admin/Badges";
import { prisma, type Prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { money, shortDate } from "@/lib/admin/format";
import { parseMonth } from "@/lib/admin/month";
import { invoiceStatuses } from "@/lib/admin/options";

export const metadata = { title: "Notas fiscais" };

type Search = { status?: string; mes?: string; q?: string };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
  const sp = await searchParams;
  const month = parseMonth(sp.mes);
  const [y, m] = month.key.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));
  const status = invoiceStatuses.some((s) => s.value === sp.status) ? sp.status : undefined;
  const q = sp.q?.trim();

  // Emitidas e canceladas contam pela data de emissão; pendentes e com erro aparecem sempre (precisam de ação).
  const where: Prisma.InvoiceWhereInput = status ? { status } : {};
  if (status !== "pendente" && status !== "erro") {
    where.OR = [{ issueDate: { gte: start, lt: end } }, ...(status ? [] : [{ status: { in: ["pendente", "erro"] } }])];
  }
  if (q) {
    const like = { contains: q, mode: "insensitive" as const };
    where.AND = [{ OR: [{ number: like }, { description: like }, { client: { name: like } }, { client: { company: like } }] }];
  }

  const [invoices, monthly, attention] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { client: { select: { name: true, company: true } }, _count: { select: { files: true } } },
      orderBy: [{ issueDate: { sort: "desc", nulls: "first" } }, { createdAt: "desc" }],
      take: 500,
    }),
    prisma.invoice.groupBy({
      by: ["status"],
      where: { issueDate: { gte: start, lt: end } },
      _sum: { amountCents: true, issCents: true },
      _count: { _all: true },
    }),
    prisma.invoice.groupBy({ by: ["status"], where: { status: { in: ["pendente", "erro"] } }, _count: { _all: true } }),
  ]);
  const issued = monthly.find((g) => g.status === "emitida");
  const cancelled = monthly.find((g) => g.status === "cancelada");
  const pending = attention.reduce((s, g) => s + g._count._all, 0);
  const errors = attention.find((g) => g.status === "erro")?._count._all ?? 0;
  const href = (changes: Partial<Search>) => {
    const next = { status, mes: month.key, q, ...changes };
    const s = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => Boolean(e[1]))).toString();
    return `/admin/notas-fiscais${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Notas fiscais"
        subtitle="Notas de serviço emitidas pelo Asaas e as emitidas no portal da prefeitura, num só lugar."
        actions={
          <>
            <nav className="adm-month" aria-label="Mês">
              <Link href={href({ mes: month.prev })} aria-label="Mês anterior">
                ←
              </Link>
              <strong>{month.label}</strong>
              {month.next ? (
                <Link href={href({ mes: month.next })} aria-label="Próximo mês">
                  →
                </Link>
              ) : (
                <span aria-hidden="true">→</span>
              )}
            </nav>
            <Link href="/admin/notas-fiscais/configuracoes" className="adm-btn ghost">
              Configurações
            </Link>
            <Link href="/admin/notas-fiscais/nova" className="adm-btn">
              + Registrar nota
            </Link>
          </>
        }
      />
      <section className="adm-lead-kpis" aria-label="Resumo do mês">
        <Link href={href({ status: "emitida" })} className="adm-kpi kpi-fechado">
          <span>Emitidas no mês</span>
          <strong>{money(issued?._sum.amountCents)}</strong>
          <small>{issued?._count._all ?? 0} nota(s)</small>
        </Link>
        <div className="adm-kpi kpi-total">
          <span>ISS do mês</span>
          <strong>{money(issued?._sum.issCents)}</strong>
          <small>Das notas emitidas</small>
        </div>
        <Link href={href({ status: "cancelada" })} className="adm-kpi kpi-perdido">
          <span>Canceladas no mês</span>
          <strong>{money(cancelled?._sum.amountCents)}</strong>
          <small>{cancelled?._count._all ?? 0} nota(s)</small>
        </Link>
        <Link href={href({ status: "pendente" })} className="adm-kpi kpi-contato">
          <span>Pendentes</span>
          <strong>{pending}</strong>
          <small>Aguardando emissão ou correção</small>
        </Link>
        <Link href={href({ status: "erro" })} className="adm-kpi kpi-novo">
          <span>Com erro</span>
          <strong>{errors}</strong>
          <small>Rejeitadas pela prefeitura</small>
        </Link>
      </section>
      <nav className="adm-tabs" aria-label="Situação">
        <Link href={href({ status: undefined })} className={!status ? "active" : ""}>
          Todas
        </Link>
        {invoiceStatuses.map((s) => (
          <Link key={s.value} href={href({ status: s.value })} className={status === s.value ? "active" : ""}>
            {s.label}
          </Link>
        ))}
      </nav>
      <form className="adm-filters" method="get">
        {status && <input type="hidden" name="status" value={status} />}
        <input type="hidden" name="mes" value={month.key} />
        <input name="q" placeholder="Buscar por número, serviço ou cliente" defaultValue={q} />
        <button type="submit" className="adm-btn ghost">
          Filtrar
        </button>
      </form>
      {invoices.length === 0 ? (
        <Empty title="Nenhuma nota neste filtro">As notas do Asaas aparecem aqui sozinhas. Notas emitidas na prefeitura você registra em “+ Registrar nota”.</Empty>
      ) : (
        <div className="adm-table-wrap adm-card flush">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Nota</th>
                <th>Tomador</th>
                <th>Emissão</th>
                <th className="num">Valor</th>
                <th>Situação</th>
                <th>Origem</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((n) => (
                <tr key={n.id} className={n.status === "cancelada" ? "is-muted" : ""}>
                  <td>
                    <Link href={`/admin/notas-fiscais/${n.id}`} className="adm-row-link">
                      <strong>{n.number ? `NF ${n.number}${n.series ? `/${n.series}` : ""}` : "Sem número"}</strong>
                      <small>
                        {n.description.length > 70 ? `${n.description.slice(0, 70)}…` : n.description}
                        {n._count.files > 0 && ` · 📎 ${n._count.files}`}
                      </small>
                    </Link>
                  </td>
                  <td>{n.client ? (n.client.company ?? n.client.name) : "—"}</td>
                  <td>{n.issueDate ? shortDate(n.issueDate.toISOString().slice(0, 10)) : "—"}</td>
                  <td className="num">
                    {money(n.amountCents)}
                    {n.issCents ? <small className="adm-sub">ISS {money(n.issCents)}</small> : null}
                  </td>
                  <td>
                    <InvoiceBadge status={n.status} />
                  </td>
                  <td>{n.source === "asaas" ? <span className="adm-badge">Asaas</span> : <span className="adm-badge">Manual</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
