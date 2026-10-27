import Link from "next/link";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import { Owner } from "@/components/admin/Avatar";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/access";
import { money, phoneLink } from "@/lib/admin/format";

export const metadata = { title: "Clientes" };

/** 12345678000190 → 12.345.678/0001-90 (ou CPF 123.456.789-00). */
function formatDocument(doc: string | null) {
  const d = (doc ?? "").replace(/\D/g, "");
  if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  return doc ?? "—";
}

export default async function ClientsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAccess("clientes", 1);
  const q = (await searchParams).q?.trim();
  const like = { contains: q ?? "", mode: "insensitive" as const };
  const clients = await prisma.client.findMany({
    where: q
      ? { OR: [{ name: like }, { company: like }, { email: like }, { phone: like }, { document: like }, { city: like }] }
      : undefined,
    include: {
      projects: { select: { valueCents: true } },
      owner: { select: { name: true, image: true } },
      _count: { select: { files: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={`${clients.length} cliente${clients.length === 1 ? "" : "s"} cadastrado${clients.length === 1 ? "" : "s"}.`}
        actions={
          <Link href="/admin/clientes/novo" className="adm-btn">
            + Novo cliente
          </Link>
        }
      />
      <form className="adm-filters" method="get">
        <input name="q" placeholder="Buscar por empresa, nome, CPF/CNPJ, cidade, e-mail ou telefone" defaultValue={q} />
        <button type="submit" className="adm-btn ghost">
          Buscar
        </button>
      </form>
      {clients.length === 0 ? (
        <Empty title="Nenhum cliente encontrado">Clientes também são criados ao converter um lead.</Empty>
      ) : (
        <div className="adm-table-wrap adm-card flush">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th className="opt">CPF / CNPJ</th>
                <th className="opt">Cidade</th>
                <th>Telefone</th>
                <th>E-mail</th>
                <th>Atendido por</th>
                <th className="num">Projetos</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => {
                const wa = phoneLink(client.phone);
                const total = client.projects.reduce((s, p) => s + p.valueCents, 0);
                return (
                  <tr key={client.id}>
                    <td>
                      <Link href={`/admin/clientes/${client.id}`} className="adm-row-link">
                        <strong>{client.company ?? client.name}</strong>
                        <small>
                          {client.company ? client.name : ""}
                          {client._count.files > 0 && ` · 📎 ${client._count.files}`}
                        </small>
                        <small className="adm-compact-only">
                          {[formatDocument(client.document), client.city ? `${client.city}${client.state ? `/${client.state}` : ""}` : null].filter((v) => v && v !== "—").join(" · ")}
                        </small>
                      </Link>
                    </td>
                    <td className="adm-mono opt">{formatDocument(client.document)}</td>
                    <td className="opt">{client.city ? `${client.city}${client.state ? `/${client.state}` : ""}` : "—"}</td>
                    <td>{client.phone ?? "—"}</td>
                    <td>{client.email ? <a href={`mailto:${client.email}`}>{client.email}</a> : "—"}</td>
                    <td>
                      <Owner user={client.owner} />
                    </td>
                    <td className="num">
                      {client.projects.length}
                      {total > 0 && <small className="adm-sub">{money(total)}</small>}
                    </td>
                    <td>
                      <div className="adm-row-actions">
                        {wa && (
                          <a href={wa} target="_blank" rel="noopener noreferrer" className="adm-icon-btn wa" aria-label={`WhatsApp de ${client.name}`}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                              <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19zM9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 1c-1.2-.5-2.5-1.8-3-3l1-1-1-2z" />
                            </svg>
                          </a>
                        )}
                      </div>
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
