import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import ActionForm, { ConfirmButton } from "@/components/admin/ActionForm";
import Avatar from "@/components/admin/Avatar";
import { Input, TextArea } from "@/components/admin/Fields";
import PageHeader from "@/components/admin/PageHeader";
import { prisma } from "@/lib/prisma";
import { getAccess, requireAccess } from "@/lib/access";
import { SUPER_ADMIN, type Permissions } from "@/lib/permissions";
import { deleteRole, saveRole } from "../../../_actions/roles";
import RoleMatrix from "../RoleMatrix";

export const metadata = { title: "Perfil de acesso" };

export default async function RolePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; criado?: string }> }) {
  await requireAccess("perfis", 1);
  const access = (await getAccess())!;
  const [{ id }, { erro, criado }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const role = await prisma.role.findUnique({
    where: { id },
    include: { users: { select: { id: true, name: true, image: true, jobTitle: true }, orderBy: { name: "asc" } } },
  });
  if (!role) notFound();

  const isSuper = role.key === SUPER_ADMIN;
  // Quem não é super admin não edita o perfil que usa (não pode aumentar o próprio acesso).
  const ownRole = !access.isSuperAdmin && access.role?.id === role.id;
  const canEdit = access.level("perfis") >= 2 && !ownRole && (!isSuper || access.isSuperAdmin);

  return (
    <>
      <PageHeader title={role.name} subtitle={role.description ?? "Perfil de acesso"} back={{ href: "/admin/perfis", label: "Perfis de acesso" }} />
      {criado && <p className="adm-alert ok">Perfil criado. Agora é só escolher este perfil no cadastro dos usuários.</p>}
      {erro === "sistema" && <p className="adm-alert">Perfis do sistema não podem ser excluídos.</p>}
      {ownRole && <p className="adm-alert">Este é o seu perfil. Para mudar as permissões dele, peça a um super admin.</p>}

      <div className="adm-detail">
        <section className="adm-card">
          <h2>Permissões por módulo</h2>
          {canEdit ? (
            <ActionForm action={saveRole.bind(null, role.id)} submitLabel="Salvar perfil">
              <Input label="Nome do perfil" name="name" defaultValue={role.name} required />
              <TextArea label="Descrição" name="description" defaultValue={role.description} rows={2} />
              <RoleMatrix initial={role.permissions as Permissions} locked={isSuper} />
            </ActionForm>
          ) : (
            <form className="adm-form" aria-disabled="true">
              <RoleMatrix initial={role.permissions as Permissions} locked />
            </form>
          )}
        </section>
        <aside className="adm-side">
          <section className="adm-card">
            <div className="adm-card-head">
              <h2>Quem usa ({role.users.length})</h2>
              {access.level("usuarios") > 0 && <Link href="/admin/usuarios">Usuários →</Link>}
            </div>
            {role.users.length === 0 ? (
              <p className="adm-card-sub">Ninguém usa este perfil ainda.</p>
            ) : (
              <ul className="adm-list compact">
                {role.users.map((u) => (
                  <li key={u.id}>
                    <Link href={`/admin/usuarios/${u.id}`} className="adm-user-cell">
                      <Avatar name={u.name} image={u.image} size={30} />
                      <span>
                        <strong>{u.name}</strong>
                        <small>{u.jobTitle ?? "Colaborador"}</small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {!role.system && access.level("perfis") >= 3 && (
            <ConfirmButton
              action={deleteRole.bind(null, role.id)}
              confirm={`Excluir o perfil ${role.name}? ${role.users.length ? `${role.users.length} usuário(s) passam para Atendente.` : ""}`}
              className="adm-btn danger ghost"
            >
              Excluir perfil
            </ConfirmButton>
          )}
        </aside>
      </div>
    </>
  );
}
