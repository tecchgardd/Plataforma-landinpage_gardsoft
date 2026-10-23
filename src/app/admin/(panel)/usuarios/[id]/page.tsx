import Link from "next/link";
import { notFound } from "next/navigation";
import ActionForm, { ConfirmButton } from "@/components/admin/ActionForm";
import { Input } from "@/components/admin/Fields";
import PageHeader from "@/components/admin/PageHeader";
import UserFields from "@/components/admin/UserFields";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { dateTime } from "@/lib/admin/format";
import { deleteUser, resetUserPassword, updateUser } from "../../../_actions/account";

export const metadata = { title: "Editar usuário" };

const errors: Record<string, string> = {
  proprio: "Você não pode excluir o próprio acesso.",
  ultimo: "Não é possível excluir o último usuário do portal.",
};

export default async function EditUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const me = await requireUser();
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  const [user, total, recent] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, username: true, email: true, phone: true, jobTitle: true, image: true },
    }),
    prisma.user.count(),
    prisma.activityLog.findMany({ where: { userId: id }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);
  if (!user) notFound();

  return (
    <>
      <PageHeader title={user.name} subtitle={user.jobTitle ?? "Colaborador"} back={{ href: "/admin/usuarios", label: "Usuários" }} />
      {erro && errors[erro] && (
        <p className="adm-alert" role="alert">
          {errors[erro]}
        </p>
      )}
      <div className="adm-detail">
        <section className="adm-card">
          <h2>Dados do colaborador</h2>
          <ActionForm action={updateUser.bind(null, user.id)} submitLabel="Salvar alterações">
            <UserFields user={user} />
          </ActionForm>
        </section>
        <aside className="adm-side">
          <section className="adm-card">
            <h2>Redefinir senha</h2>
            <p className="adm-card-sub">
              {user.id === me.id ? "Define uma nova senha para o seu acesso." : "O colaborador será desconectado e entra com a nova senha."}
            </p>
            <ActionForm action={resetUserPassword.bind(null, user.id)} submitLabel="Redefinir senha">
              <Input label="Nova senha" name="password" type="password" required wide />
              <Input label="Confirme" name="confirm" type="password" required wide />
            </ActionForm>
          </section>
          <section className="adm-card">
            <div className="adm-card-head">
              <h2>Atividade recente</h2>
              <Link href={`/admin/historico?usuario=${user.id}`}>Ver tudo →</Link>
            </div>
            {recent.length === 0 ? (
              <p className="adm-card-sub">Nenhuma ação registrada.</p>
            ) : (
              <ul className="adm-list compact">
                {recent.map((a) => (
                  <li key={a.id}>
                    <div>
                      <span>
                        <strong>{a.summary}</strong>
                        <small>{dateTime(a.createdAt)}</small>
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {user.id !== me.id && total > 1 && (
            <ConfirmButton
              action={deleteUser.bind(null, user.id)}
              confirm={`Excluir o acesso de ${user.name}? Os leads, clientes e projetos dele ficam sem responsável.`}
              className="adm-btn danger ghost"
            >
              Excluir usuário
            </ConfirmButton>
          )}
        </aside>
      </div>
    </>
  );
}
