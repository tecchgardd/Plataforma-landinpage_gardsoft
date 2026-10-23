import ActionForm from "@/components/admin/ActionForm";
import PageHeader from "@/components/admin/PageHeader";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getFinanceSettings } from "@/lib/finance/settings";
import { saveContract } from "../../../_actions/contracts";
import ContractFields from "../ContractFields";

export const metadata = { title: "Novo contrato" };

export default async function NewContractPage({ searchParams }: { searchParams: Promise<{ cliente?: string; projeto?: string }> }) {
  await requireUser();
  const { cliente, projeto } = await searchParams;
  const [clients, projects, settings, project] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true, company: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
    getFinanceSettings(),
    projeto && /^[0-9a-f-]{36}$/i.test(projeto)
      ? prisma.project.findUnique({ where: { id: projeto }, select: { id: true, name: true, clientId: true, description: true, valueCents: true, service: true } })
      : null,
  ]);

  return (
    <>
      <PageHeader
        title="Novo contrato"
        subtitle={project ? `A partir do projeto ${project.name}: escopo e valor já preenchidos.` : "Preencha os dados e salve como rascunho para revisar o PDF."}
        back={{ href: "/admin/contratos", label: "Contratos" }}
      />
      <div className="adm-card">
        <ActionForm action={saveContract.bind(null, null)} submitLabel="Salvar rascunho">
          <ContractFields
            clients={clients}
            projects={projects}
            contract={{
              title: project ? `Desenvolvimento — ${project.service ?? project.name}` : "",
              clientId: project?.clientId ?? cliente ?? "",
              projectId: project?.id ?? null,
              preamble: settings.contract.preamble,
              scope: project?.description ?? "",
              clauses: settings.contract.clauses,
              deliveryDays: settings.contract.deliveryDays || null,
              valueCents: project?.valueCents ?? 0,
              paymentPlan: [],
            }}
          />
        </ActionForm>
      </div>
    </>
  );
}
