import ActionForm from "@/components/admin/ActionForm";
import { Input, TextArea } from "@/components/admin/Fields";
import PageHeader from "@/components/admin/PageHeader";
import { requireAccess } from "@/lib/access";
import { defaultPermissions } from "@/lib/permissions";
import { saveRole } from "../../../_actions/roles";
import RoleMatrix from "../RoleMatrix";

export const metadata = { title: "Novo perfil de acesso" };

export default async function NewRolePage() {
  await requireAccess("perfis", 2);
  return (
    <>
      <PageHeader
        title="Novo perfil de acesso"
        subtitle="Começa com as permissões do Atendente. Ajuste módulo a módulo."
        back={{ href: "/admin/perfis", label: "Perfis de acesso" }}
      />
      <div className="adm-card">
        <ActionForm action={saveRole.bind(null, null)} submitLabel="Criar perfil">
          <Input label="Nome do perfil" name="name" required placeholder="Ex.: Financeiro, Designer, Estagiário" />
          <TextArea label="Descrição" name="description" rows={2} placeholder="Para quem é este perfil" />
          <RoleMatrix initial={defaultPermissions.atendente} />
        </ActionForm>
      </div>
    </>
  );
}
