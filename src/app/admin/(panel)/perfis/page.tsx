import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import { prisma } from "@/lib/prisma";
import { getAccess, requireAccess } from "@/lib/access";
import { levelOf, levels, modules } from "@/lib/permissions";

export const metadata = { title: "Perfis de acesso" };

export default async function RolesPage() {
  await requireAccess("perfis", 1);
  const access = (await getAccess())!;
  const roles = await prisma.role.findMany({ orderBy: { createdAt: "asc" }, include: { _count: { select: { users: true } } } });

  return (
    <>
      <PageHeader
        title="Perfis de acesso"
        subtitle="Quem vê o quê no portal. Cada usuário tem um perfil; cada perfil define o nível em cada módulo."
        actions={
          access.level("perfis") >= 2 && (
            <Link href="/admin/perfis/novo" className="adm-btn">
              + Novo perfil
            </Link>
          )
        }
      />

      <div className="adm-role-cards">
        {roles.map((r) => (
          <Link key={r.id} href={`/admin/perfis/${r.id}`} className="adm-card adm-role-card">
            <span className="adm-role-head">
              <strong>{r.name}</strong>
              {r.system && <span className="adm-badge">Sistema</span>}
            </span>
            <small>{r.description ?? "Sem descrição."}</small>
            <span className="adm-sub">
              {r._count.users} usuário{r._count.users === 1 ? "" : "s"} · {modules.filter((m) => levelOf(r, m.key) > 0).length} de {modules.length} módulos
            </span>
          </Link>
        ))}
      </div>

      <section className="adm-card flush">
        <div className="adm-card-head adm-card-pad">
          <h2>Comparativo</h2>
          <span className="adm-card-sub">— sem acesso · Ver · Editar · Total (inclui excluir)</span>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table adm-table-keep adm-role-table">
            <thead>
              <tr>
                <th>Módulo</th>
                {roles.map((r) => (
                  <th key={r.id}>{r.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modules.map((m) => (
                <tr key={m.key}>
                  <td>
                    {m.label}
                    <small className="adm-sub">{m.group}</small>
                  </td>
                  {roles.map((r) => {
                    const lv = levelOf(r, m.key);
                    return (
                      <td key={r.id}>
                        <span className={`adm-level lv-${lv}`}>{levels[lv].short}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
