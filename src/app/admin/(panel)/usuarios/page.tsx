import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import Avatar from "@/components/admin/Avatar";
import { ConfirmButton } from "@/components/admin/ActionForm";
import { prisma } from "@/lib/prisma";
import { activeProject } from "@/lib/project-columns";
import { getAccess, requireAccess } from "@/lib/access";
import { dateTime, shortDate } from "@/lib/admin/format";
import { deleteUser } from "../../_actions/account";

export const metadata = { title: "Usuários" };

export default async function UsersPage() {
  const me = await requireAccess("usuarios", 1);
  const access = (await getAccess())!;
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      role: { select: { id: true, name: true, key: true } },
      sessions: { select: { updatedAt: true }, orderBy: { updatedAt: "desc" }, take: 1 },
      _count: {
        select: {
          leads: { where: { status: { notIn: ["fechado", "perdido"] } } },
          clients: true,
          projects: { where: activeProject },
        },
      },
    },
  });

  return (
    <>
      <PageHeader
        title="Usuários"
        subtitle="Colaboradores com acesso ao portal."
        actions={
          access.level("usuarios") >= 2 && (
            <>
              {access.level("perfis") > 0 && (
                <Link href="/admin/perfis" className="adm-btn ghost">
                  Perfis de acesso
                </Link>
              )}
              <Link href="/admin/usuarios/novo" className="adm-btn">
                + Novo usuário
              </Link>
            </>
          )
        }
      />
      <div className="adm-table-wrap adm-card flush">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Colaborador</th>
              <th className="opt">Login</th>
              <th>Perfil</th>
              <th>Contato</th>
              <th className="num opt">Atendendo</th>
              <th>Último acesso</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <Link href={`/admin/usuarios/${u.id}`} className="adm-user-cell">
                    <Avatar name={u.name} image={u.image} size={36} />
                    <span>
                      <strong>
                        {u.name} {u.id === me.id && <span className="adm-badge">você</span>}
                      </strong>
                      <small>{u.jobTitle ?? `Desde ${shortDate(u.createdAt)}`}</small>
                      <small className="adm-compact-only">
                        @{u.username ?? "—"} · {u._count.leads} leads · {u._count.projects} projetos
                      </small>
                    </span>
                  </Link>
                </td>
                <td className="adm-mono opt">@{u.username ?? "—"}</td>
                <td>
                  <span className={`adm-badge ${u.role?.key === "super_admin" ? "role-super" : ""}`}>{u.role?.name ?? "Sem perfil"}</span>
                </td>
                <td>
                  {u.email}
                  {u.phone && <small className="adm-sub">{u.phone}</small>}
                </td>
                <td className="num opt">
                  {u._count.leads} leads
                  <small className="adm-sub">
                    {u._count.clients} clientes · {u._count.projects} projetos
                  </small>
                </td>
                <td>{u.sessions[0] ? dateTime(u.sessions[0].updatedAt) : "Nunca entrou"}</td>
                <td>
                  <div className="adm-row-actions">
                    <Link href={`/admin/usuarios/${u.id}`} className="adm-btn ghost small">
                      Editar
                    </Link>
                    {access.level("usuarios") >= 3 && u.id !== me.id && users.length > 1 && (
                      <ConfirmButton
                        action={deleteUser.bind(null, u.id)}
                        confirm={`Excluir o acesso de ${u.name}? Os leads, clientes e projetos dele ficam sem responsável.`}
                        className="adm-btn danger ghost small"
                      >
                        Excluir
                      </ConfirmButton>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
