import ActionForm from "@/components/admin/ActionForm";
import PageHeader from "@/components/admin/PageHeader";
import UserFields from "@/components/admin/UserFields";
import { getAccess, requireAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { SUPER_ADMIN } from "@/lib/permissions";
import { createUser } from "../../../_actions/account";

export const metadata = { title: "Novo usuário" };

export default async function NewUserPage() {
  await requireAccess("usuarios", 2);
  const access = (await getAccess())!;
  // Só um super admin pode criar outro super admin.
  const roles = await prisma.role.findMany({
    where: access.isSuperAdmin ? {} : { key: { not: SUPER_ADMIN } },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });
  return (
    <>
      <PageHeader title="Novo usuário" subtitle="Crie o acesso de um colaborador ao portal." back={{ href: "/admin/usuarios", label: "Usuários" }} />
      <div className="adm-card">
        <ActionForm action={createUser} submitLabel="Criar acesso">
          <UserFields withPassword roles={roles} />
        </ActionForm>
      </div>
    </>
  );
}
