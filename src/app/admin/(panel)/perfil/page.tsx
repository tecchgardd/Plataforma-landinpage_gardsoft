import ActionForm from "@/components/admin/ActionForm";
import PageHeader from "@/components/admin/PageHeader";
import UserFields from "@/components/admin/UserFields";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { updateProfile } from "../../_actions/account";
import PasswordForm from "./PasswordForm";

export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const me = await requireUser();
  const [profile, stats] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: me.id },
      select: { name: true, username: true, email: true, phone: true, jobTitle: true, image: true },
    }),
    Promise.all([
      prisma.lead.count({ where: { ownerId: me.id, status: { notIn: ["fechado", "perdido"] } } }),
      prisma.client.count({ where: { ownerId: me.id } }),
      prisma.project.count({ where: { ownerId: me.id, stage: { not: "no_ar" } } }),
    ]),
  ]);

  return (
    <>
      <PageHeader title="Perfil" subtitle="Seus dados aparecem para a equipe como responsável pelos leads, clientes e projetos." />
      <section className="adm-kpis three">
        <div className="adm-kpi">
          <span>Leads em atendimento</span>
          <strong>{stats[0]}</strong>
        </div>
        <div className="adm-kpi">
          <span>Clientes</span>
          <strong>{stats[1]}</strong>
        </div>
        <div className="adm-kpi">
          <span>Projetos em andamento</span>
          <strong>{stats[2]}</strong>
        </div>
      </section>
      <div className="adm-grid-2">
        <section className="adm-card">
          <h2>Dados do colaborador</h2>
          <p className="adm-card-sub">Foto, nome, contato e login.</p>
          <ActionForm action={updateProfile} submitLabel="Salvar perfil">
            <UserFields user={profile} />
          </ActionForm>
        </section>
        <section className="adm-card">
          <h2>Trocar senha</h2>
          <p className="adm-card-sub">Ao trocar, as outras sessões abertas são encerradas.</p>
          <PasswordForm />
        </section>
      </div>
    </>
  );
}
