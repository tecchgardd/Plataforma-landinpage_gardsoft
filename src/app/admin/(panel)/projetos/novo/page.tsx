import ActionForm from "@/components/admin/ActionForm";
import PageHeader from "@/components/admin/PageHeader";
import { prisma } from "@/lib/prisma";
import { getTeam } from "@/lib/activity";
import { requireAccess } from "@/lib/access";
import { saveProject } from "../../../_actions/projects";
import ProjectFields from "../ProjectFields";

export const metadata = { title: "Novo projeto" };

export default async function NewProjectPage({ searchParams }: { searchParams: Promise<{ cliente?: string }> }) {
  await requireAccess("projetos", 2);
  const { cliente } = await searchParams;
  const [clients, team] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true, company: true }, orderBy: { name: "asc" } }),
    getTeam(),
  ]);
  return (
    <>
      <PageHeader title="Novo projeto" back={{ href: "/admin/projetos", label: "Projetos" }} />
      <div className="adm-card">
        <ActionForm action={saveProject.bind(null, null)} submitLabel="Criar projeto">
          <ProjectFields clients={clients} team={team} clientId={cliente} />
        </ActionForm>
      </div>
    </>
  );
}
