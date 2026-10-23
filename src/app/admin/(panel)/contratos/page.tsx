import Link from "next/link";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import { ContractBadge } from "@/components/admin/Badges";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { dateTime, money } from "@/lib/admin/format";
import { contractStatuses } from "@/lib/admin/options";

export const metadata = { title: "Contratos" };

export default async function ContractsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireUser();
  const { status } = await searchParams;
  const filter = contractStatuses.some((s) => s.value === status) ? status : undefined;
  const [contracts, counts] = await Promise.all([
    prisma.contract.findMany({
      where: filter ? { status: filter } : undefined,
      include: { client: { select: { name: true, company: true } }, project: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.contract.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countOf = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));
  const total = counts.reduce((s, c) => s + c._count._all, 0);

  return (
    <>
      <PageHeader
        title="Contratos"
        subtitle="Monte o contrato a partir do cliente e do escopo do projeto, envie para assinatura eletrônica e acompanhe."
        actions={
          <Link href="/admin/contratos/novo" className="adm-btn">
            + Novo contrato
          </Link>
        }
      />
      <nav className="adm-tabs" aria-label="Filtrar por status">
        <Link href="/admin/contratos" className={!filter ? "active" : ""}>
          Todos <span>{total}</span>
        </Link>
        {contractStatuses.map((s) => (
          <Link key={s.value} href={`/admin/contratos?status=${s.value}`} className={filter === s.value ? "active" : ""}>
            {s.label} <span>{countOf[s.value] ?? 0}</span>
          </Link>
        ))}
      </nav>
      {contracts.length === 0 ? (
        <Empty title="Nenhum contrato">Crie um contrato a partir de um cliente ou de um projeto fechado.</Empty>
      ) : (
        <div className="adm-table-wrap adm-card flush">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Contrato</th>
                <th>Cliente</th>
                <th className="num">Valor</th>
                <th>Status</th>
                <th>Última movimentação</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/contratos/${c.id}`} className="adm-row-link">
                      <strong>{c.title}</strong>
                      <small className="adm-mono">
                        {c.number}
                        {c.project ? ` · ${c.project.name}` : ""}
                      </small>
                    </Link>
                  </td>
                  <td>{c.client.company ?? c.client.name}</td>
                  <td className="num">{money(c.valueCents)}</td>
                  <td>
                    <ContractBadge status={c.status} />
                  </td>
                  <td>
                    {c.signedAt
                      ? `Assinado ${dateTime(c.signedAt)}`
                      : c.viewedAt
                        ? `Visto ${dateTime(c.viewedAt)}`
                        : c.sentAt
                          ? `Enviado ${dateTime(c.sentAt)}`
                          : `Criado ${dateTime(c.createdAt)}`}
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
