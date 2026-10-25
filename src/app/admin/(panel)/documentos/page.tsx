import Link from "next/link";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import { DocumentBadge } from "@/components/admin/Badges";
import { prisma, type Prisma } from "@/lib/prisma";
import { getAccess, requireAccess } from "@/lib/access";
import { dateTime } from "@/lib/admin/format";
import { documentStatuses, documentTypes, typeOf } from "@/lib/documents";

export const metadata = { title: "Documentos do projeto" };

type Search = { tipo?: string; situacao?: string; q?: string; projeto?: string };

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAccess("documentos", 1);
  const access = (await getAccess())!;
  const sp = await searchParams;
  const where: Prisma.ProjectDocumentWhereInput = {};
  if (documentTypes.some((t) => t.value === sp.tipo)) where.type = sp.tipo;
  if (documentStatuses.some((s) => s.value === sp.situacao)) where.status = sp.situacao;
  if (sp.projeto) where.projectId = sp.projeto;
  const q = sp.q?.trim();
  if (q) {
    const like = { contains: q, mode: "insensitive" as const };
    where.OR = [{ title: like }, { number: like }, { project: { name: like } }, { client: { name: like } }, { client: { company: like } }];
  }

  const [docs, counts] = await Promise.all([
    prisma.projectDocument.findMany({
      where,
      include: { client: { select: { name: true, company: true } }, project: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
      take: 300,
    }),
    prisma.projectDocument.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const count = (status: string) => counts.find((c) => c.status === status)?._count._all ?? 0;
  const href = (changes: Partial<Search>) => {
    const next = { tipo: sp.tipo, situacao: sp.situacao, q, ...changes };
    const s = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => Boolean(e[1]))).toString();
    return `/admin/documentos${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <PageHeader
        title="Documentos do projeto"
        subtitle="Termo de abertura, escopo, MER, aprovação de layout, atas e termo de entrega — com aprovação do cliente por link."
        actions={
          access.level("documentos") >= 2 && (
            <Link href="/admin/documentos/novo" className="adm-btn">
              + Novo documento
            </Link>
          )
        }
      />

      <section className="adm-lead-kpis adm-kpis-4" aria-label="Situação dos documentos">
        <Link href={href({ situacao: "visualizado" })} className="adm-kpi kpi-contato">
          <span>Aguardando o cliente</span>
          <strong>{count("enviado") + count("visualizado")}</strong>
          <small>{count("visualizado")} já foram lidos</small>
        </Link>
        <Link href={href({ situacao: "ajustes" })} className="adm-kpi kpi-perdido">
          <span>Ajustes pedidos</span>
          <strong>{count("ajustes")}</strong>
          <small>Precisam de nova versão</small>
        </Link>
        <Link href={href({ situacao: "aprovado" })} className="adm-kpi kpi-fechado">
          <span>Aprovados</span>
          <strong>{count("aprovado")}</strong>
          <small>Com registro de aceite</small>
        </Link>
        <Link href={href({ situacao: "rascunho" })} className="adm-kpi kpi-total">
          <span>Rascunhos</span>
          <strong>{count("rascunho")}</strong>
          <small>Ainda não enviados</small>
        </Link>
      </section>

      <form className="adm-filters" method="get">
        <input name="q" placeholder="Buscar por título, número, projeto ou cliente" defaultValue={q} />
        <select name="tipo" defaultValue={sp.tipo ?? ""} aria-label="Tipo">
          <option value="">Todos os tipos</option>
          {documentTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.short}
            </option>
          ))}
        </select>
        <select name="situacao" defaultValue={sp.situacao ?? ""} aria-label="Situação">
          <option value="">Todas as situações</option>
          {documentStatuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className="adm-btn ghost">
          Filtrar
        </button>
      </form>

      {docs.length === 0 ? (
        <Empty title="Nenhum documento aqui">
          {access.level("documentos") >= 2 ? <Link href="/admin/documentos/novo">Crie o primeiro</Link> : "Nada com esses filtros."} — por exemplo, o termo de abertura do
          próximo projeto.
        </Empty>
      ) : (
        <div className="adm-table-wrap adm-card flush">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Projeto / cliente</th>
                <th>Versão</th>
                <th>Situação</th>
                <th>Atualizado</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/admin/documentos/${d.id}`} className="adm-row-link">
                      <strong>{d.title}</strong>
                      <small>
                        {d.number} · {typeOf(d.type).short}
                      </small>
                    </Link>
                  </td>
                  <td>
                    {d.project?.name ?? "—"}
                    {d.client && <small className="adm-sub">{d.client.company ?? d.client.name}</small>}
                  </td>
                  <td>v{d.version}</td>
                  <td>
                    <DocumentBadge status={d.status} />
                  </td>
                  <td>{dateTime(d.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
