import ActionForm from "@/components/admin/ActionForm";
import { Input, Select } from "@/components/admin/Fields";
import PageHeader from "@/components/admin/PageHeader";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/access";
import { documentTypes } from "@/lib/documents";
import { createDocument } from "../../../_actions/documents";

export const metadata = { title: "Novo documento" };

export default async function NewDocumentPage({ searchParams }: { searchParams: Promise<{ projeto?: string; tipo?: string }> }) {
  await requireAccess("documentos", 2);
  const sp = await searchParams;
  const [projects, clients] = await Promise.all([
    prisma.project.findMany({ select: { id: true, name: true, client: { select: { company: true, name: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.client.findMany({ select: { id: true, name: true, company: true }, orderBy: { name: "asc" } }),
  ]);
  const initialType = documentTypes.some((t) => t.value === sp.tipo) ? sp.tipo : "tap";

  return (
    <>
      <PageHeader
        title="Novo documento"
        subtitle="Escolha o tipo: o documento já começa com as seções certas para preencher."
        back={{ href: "/admin/documentos", label: "Documentos" }}
      />
      <div className="adm-card">
        <ActionForm action={createDocument} submitLabel="Criar e editar">
          <fieldset className="adm-fieldset">
            <legend>Tipo de documento</legend>
            <div className="adm-type-cards wide" role="radiogroup" aria-label="Tipo de documento">
              {documentTypes.map((t) => (
                <label key={t.value} className="adm-type-card">
                  <input type="radio" name="type" value={t.value} defaultChecked={t.value === initialType} />
                  <strong>{t.label}</strong>
                  <small>{t.description}</small>
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset className="adm-fieldset">
            <legend>Identificação</legend>
            <Input label="Título" name="title" required wide placeholder="Ex.: Termo de abertura — Site institucional Padaria Sol" />
            <Select
              label="Projeto"
              name="projectId"
              options={projects.map((p) => ({ value: p.id, label: p.client ? `${p.name} — ${p.client.company ?? p.client.name}` : p.name }))}
              defaultValue={sp.projeto}
              empty="Sem projeto"
              hint="O cliente do projeto é usado automaticamente."
            />
            <Select
              label="Cliente"
              name="clientId"
              options={clients.map((c) => ({ value: c.id, label: c.company ? `${c.company} (${c.name})` : c.name }))}
              empty="O do projeto"
              hint="Quem vai receber o link para aprovar."
            />
          </fieldset>
        </ActionForm>
      </div>
    </>
  );
}
