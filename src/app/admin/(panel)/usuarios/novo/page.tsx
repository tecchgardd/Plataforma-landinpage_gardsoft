import ActionForm from "@/components/admin/ActionForm";
import PageHeader from "@/components/admin/PageHeader";
import UserFields from "@/components/admin/UserFields";
import { requireUser } from "@/lib/session";
import { createUser } from "../../../_actions/account";

export const metadata = { title: "Novo usuário" };

export default async function NewUserPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="Novo usuário" subtitle="Crie o acesso de um colaborador ao portal." back={{ href: "/admin/usuarios", label: "Usuários" }} />
      <div className="adm-card">
        <ActionForm action={createUser} submitLabel="Criar acesso">
          <UserFields withPassword />
        </ActionForm>
      </div>
    </>
  );
}
