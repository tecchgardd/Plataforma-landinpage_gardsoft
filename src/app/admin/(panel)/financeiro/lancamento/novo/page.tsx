import ActionForm from "@/components/admin/ActionForm";
import PageHeader from "@/components/admin/PageHeader";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { saveEntry } from "../../../../_actions/finance";
import EntryFields from "../../EntryFields";

export const metadata = { title: "Novo lançamento" };

export default async function NewEntryPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  await requireUser();
  const type = (await searchParams).tipo === "pagar" ? "pagar" : "receber";
  const [clients, projects] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true, company: true }, orderBy: { name: "asc" } }),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
  ]);
  return (
    <>
      <PageHeader
        title={type === "receber" ? "Nova conta a receber" : "Nova conta a pagar"}
        back={{ href: `/admin/financeiro/${type}`, label: type === "receber" ? "Contas a receber" : "Contas a pagar" }}
      />
      <div className="adm-card">
        <ActionForm action={saveEntry.bind(null, null)} submitLabel="Lançar">
          <EntryFields type={type} clients={clients} projects={projects} isNew />
        </ActionForm>
      </div>
    </>
  );
}
