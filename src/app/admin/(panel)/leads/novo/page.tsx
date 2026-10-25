import ActionForm from "@/components/admin/ActionForm";
import PageHeader from "@/components/admin/PageHeader";
import { prisma } from "@/lib/prisma";
import { getTeam } from "@/lib/activity";
import { requireAccess } from "@/lib/access";
import { saveLead } from "../../../_actions/leads";
import LeadFields from "../LeadFields";

export const metadata = { title: "Novo lead" };

export default async function NewLeadPage() {
  await requireAccess("leads", 2);
  const [campaigns, team] = await Promise.all([
    prisma.campaign.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    getTeam(),
  ]);
  return (
    <>
      <PageHeader title="Novo lead" back={{ href: "/admin/leads", label: "Leads" }} />
      <div className="adm-card">
        <ActionForm action={saveLead.bind(null, null)} submitLabel="Cadastrar lead">
          <LeadFields campaigns={campaigns} team={team} />
        </ActionForm>
      </div>
    </>
  );
}
