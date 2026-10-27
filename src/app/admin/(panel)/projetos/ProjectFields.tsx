import { Input, Select, TextArea } from "@/components/admin/Fields";
import { fromDbDate, type Client, type Project } from "@/lib/prisma";
import { projectStages, serviceOptions } from "@/lib/admin/options";

export default function ProjectFields({
  project,
  clients,
  team,
  clientId,
}: {
  project?: Project;
  clients: Pick<Client, "id" | "name" | "company">[];
  team: { id: string; name: string }[];
  clientId?: string;
}) {
  return (
    <>
      <fieldset className="adm-fieldset">
        <legend>Projeto</legend>
        <Input label="Nome do projeto" name="name" defaultValue={project?.name} required wide />
        <Select
          label="Cliente"
          name="clientId"
          options={clients.map((c) => ({ value: c.id, label: c.company ? `${c.company} (${c.name})` : c.name }))}
          defaultValue={project?.clientId ?? clientId}
          empty="Sem cliente"
        />
        <Select
          label="Responsável"
          name="ownerId"
          options={team.map((u) => ({ value: u.id, label: u.name }))}
          defaultValue={project?.ownerId}
          empty="Sem responsável"
        />
        <Select label="Serviço" name="service" options={serviceOptions} defaultValue={project?.service} empty="Não definido" />
        <Select label="Etapa" name="stage" options={projectStages} defaultValue={project?.stage ?? "briefing"} />
        <Input label="Início" name="startDate" type="date" defaultValue={fromDbDate(project?.startDate)} />
        <Input label="Entrega prevista" name="dueDate" type="date" defaultValue={fromDbDate(project?.dueDate)} />
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Escopo</legend>
        <TextArea
          label="Descrição detalhada"
          name="description"
          defaultValue={project?.description}
          wide
          rows={8}
          placeholder="Objetivo, páginas, funcionalidades, público, referências, o que está combinado com o cliente..."
        />
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Links</legend>
        <Input label="GitHub" name="githubUrl" type="url" inputMode="url" placeholder="https://github.com/..." defaultValue={project?.githubUrl} />
        <Input label="Preview (Vercel ou outra hospedagem)" name="previewUrl" type="url" inputMode="url" placeholder="https://...vercel.app" defaultValue={project?.previewUrl} />
        <Input label="Design (Figma...)" name="designUrl" type="url" inputMode="url" placeholder="https://figma.com/..." defaultValue={project?.designUrl} />
        <Input label="Documentação (Notion, Drive...)" name="docsUrl" type="url" inputMode="url" placeholder="https://" defaultValue={project?.docsUrl} />
        <Input label="Site publicado (produção)" name="url" type="url" inputMode="url" placeholder="https://" defaultValue={project?.url} wide />
        <TextArea label="Anotações internas" name="notes" defaultValue={project?.notes} wide rows={3} placeholder="Acessos, pendências, combinados..." />
      </fieldset>
    </>
  );
}
