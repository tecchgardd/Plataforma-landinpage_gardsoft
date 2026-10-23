import ActionForm from "@/components/admin/ActionForm";
import PageHeader from "@/components/admin/PageHeader";
import { requireUser } from "@/lib/session";
import { saveCampaign } from "../../../_actions/campaigns";
import CampaignFields from "../CampaignFields";

export const metadata = { title: "Nova campanha" };

export default async function NewCampaignPage() {
  await requireUser();
  return (
    <>
      <PageHeader title="Nova campanha" back={{ href: "/admin/campanhas", label: "Campanhas" }} />
      <div className="adm-card">
        <ActionForm action={saveCampaign.bind(null, null)} submitLabel="Criar campanha">
          <CampaignFields />
        </ActionForm>
      </div>
    </>
  );
}
