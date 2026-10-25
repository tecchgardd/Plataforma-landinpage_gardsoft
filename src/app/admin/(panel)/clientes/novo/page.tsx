import ActionForm from "@/components/admin/ActionForm";
import PageHeader from "@/components/admin/PageHeader";
import { getTeam } from "@/lib/activity";
import { requireAccess } from "@/lib/access";
import { saveClient } from "../../../_actions/clients";
import ClientFields from "../ClientFields";

export const metadata = { title: "Novo cliente" };

export default async function NewClientPage() {
  await requireAccess("clientes", 2);
  const team = await getTeam();
  return (
    <>
      <PageHeader title="Novo cliente" subtitle="Os documentos podem ser anexados logo após o cadastro." back={{ href: "/admin/clientes", label: "Clientes" }} />
      <div className="adm-card">
        <ActionForm action={saveClient.bind(null, null)} submitLabel="Cadastrar cliente">
          <ClientFields team={team} />
        </ActionForm>
      </div>
    </>
  );
}
