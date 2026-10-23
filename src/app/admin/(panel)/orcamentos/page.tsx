import Link from "next/link";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import { QuoteBadge } from "@/components/admin/Badges";
import { prisma, type Prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { dateTime, money, shortDate } from "@/lib/admin/format";
import { quoteStatuses } from "@/lib/admin/options";

export const metadata = { title: "Orçamentos" };

const views = [
  { value: "abertos", label: "Em aberto" },
  { value: "vencidos", label: "Vencidos" },
  ...quoteStatuses.filter((s) => s.value !== "enviado" && s.value !== "visualizado"),
] as const;

export default async function QuotesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireUser();
  const sp = await searchParams;
  const view = views.find((v) => v.value === sp.status)?.value;
  const today = new Date(`${new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10)}T00:00:00Z`);
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const open: Prisma.QuoteWhereInput = { status: { in: ["enviado", "visualizado"] } };

  const where: Prisma.QuoteWhereInput =
    view === "abertos"
      ? { ...open, OR: [{ validUntil: null }, { validUntil: { gte: today } }] }
      : view === "vencidos"
        ? { ...open, validUntil: { lt: today } }
        : view
          ? { status: view }
          : {};
  const q = sp.q?.trim();
  if (q) {
    const like = { contains: q, mode: "insensitive" as const };
    where.AND = [{ OR: [{ title: like }, { number: like }, { client: { name: like } }, { client: { company: like } }, { lead: { name: like } }, { lead: { company: like } }] }];
  }

  const [quotes, openSum, decidedMonth] = await Promise.all([
    prisma.quote.findMany({
      where,
      include: { client: { select: { name: true, company: true } }, lead: { select: { name: true, company: true } }, contract: { select: { number: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.quote.aggregate({ where: { ...open, OR: [{ validUntil: null }, { validUntil: { gte: today } }] }, _sum: { totalCents: true }, _count: { _all: true } }),
    prisma.quote.groupBy({ by: ["status"], where: { decidedAt: { gte: monthStart } }, _sum: { totalCents: true }, _count: { _all: true } }),
  ]);
  const approved = decidedMonth.find((g) => g.status === "aprovado");
  const refused = decidedMonth.find((g) => g.status === "recusado");
  const decided = (approved?._count._all ?? 0) + (refused?._count._all ?? 0);
  const rate = decided ? Math.round(((approved?._count._all ?? 0) / decided) * 100) : null;
  const href = (status?: string) => `/admin/orcamentos${status ? `?status=${status}` : ""}`;

  return (
    <>
      <PageHeader
        title="Orçamentos"
        subtitle="Monte a proposta com os serviços e valores, envie o link para o cliente aprovar e transforme em contrato."
        actions={
          <Link href="/admin/orcamentos/novo" className="adm-btn">
            + Novo orçamento
          </Link>
        }
      />
      <section className="adm-lead-kpis adm-kpis-3" aria-label="Resumo">
        <Link href={href("abertos")} className="adm-kpi kpi-contato">
          <span>Aguardando resposta</span>
          <strong>{money(openSum._sum.totalCents)}</strong>
          <small>{openSum._count._all} orçamento(s) dentro da validade</small>
        </Link>
        <Link href={href("aprovado")} className="adm-kpi kpi-fechado">
          <span>Aprovados no mês</span>
          <strong>{money(approved?._sum.totalCents)}</strong>
          <small>{approved?._count._all ?? 0} orçamento(s)</small>
        </Link>
        <div className="adm-kpi kpi-total">
          <span>Taxa de aprovação no mês</span>
          <strong>{rate === null ? "—" : `${rate}%`}</strong>
          <small>{decided} resposta(s) recebida(s)</small>
        </div>
      </section>
      <nav className="adm-tabs" aria-label="Filtrar por situação">
        <Link href={href()} className={!view ? "active" : ""}>
          Todos
        </Link>
        {views.map((v) => (
          <Link key={v.value} href={href(v.value)} className={view === v.value ? "active" : ""}>
            {v.label}
          </Link>
        ))}
      </nav>
      <form className="adm-filters" method="get">
        {view && <input type="hidden" name="status" value={view} />}
        <input name="q" placeholder="Buscar por título, número ou cliente" defaultValue={q} />
        <button type="submit" className="adm-btn ghost">
          Filtrar
        </button>
      </form>
      {quotes.length === 0 ? (
        <Empty title="Nenhum orçamento">Crie um orçamento a partir de um lead ou de um cliente.</Empty>
      ) : (
        <div className="adm-table-wrap adm-card flush">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Orçamento</th>
                <th>Para</th>
                <th className="num">Valor</th>
                <th>Validade</th>
                <th>Situação</th>
                <th>Última movimentação</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((o) => {
                const to = o.client ?? o.lead;
                return (
                  <tr key={o.id}>
                    <td>
                      <Link href={`/admin/orcamentos/${o.id}`} className="adm-row-link">
                        <strong>{o.title}</strong>
                        <small className="adm-mono">
                          {o.number}
                          {o.contract ? ` · contrato ${o.contract.number}` : ""}
                        </small>
                      </Link>
                    </td>
                    <td>
                      {to ? (to.company ?? to.name) : "—"}
                      {!o.client && o.lead && <small className="adm-sub">Lead</small>}
                    </td>
                    <td className="num">{money(o.totalCents)}</td>
                    <td>{o.validUntil ? shortDate(o.validUntil.toISOString().slice(0, 10)) : "—"}</td>
                    <td>
                      <QuoteBadge status={o.status} validUntil={o.validUntil} />
                    </td>
                    <td>
                      {o.decidedAt
                        ? `Respondido ${dateTime(o.decidedAt)}`
                        : o.viewedAt
                          ? `Visto ${dateTime(o.viewedAt)}`
                          : o.sentAt
                            ? `Enviado ${dateTime(o.sentAt)}`
                            : `Criado ${dateTime(o.createdAt)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
