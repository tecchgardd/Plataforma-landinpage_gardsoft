import { Input, Select, TextArea } from "@/components/admin/Fields";
import type { Campaign, Lead } from "@/lib/prisma";
import { leadSources, leadStatuses, serviceOptions, temperatures } from "@/lib/admin/options";

export default function LeadFields({
  lead,
  campaigns,
  team,
}: {
  lead?: Lead;
  campaigns: Pick<Campaign, "id" | "name">[];
  team: { id: string; name: string }[];
}) {
  return (
    <>
      <fieldset className="adm-fieldset">
        <legend>Contato</legend>
        <Input label="Nome" name="name" defaultValue={lead?.name} required />
        <Input label="Empresa" name="company" defaultValue={lead?.company} />
        <Input label="WhatsApp / telefone" name="phone" type="tel" inputMode="tel" defaultValue={lead?.phone} />
        <Input label="E-mail" name="email" type="email" defaultValue={lead?.email} />
        <Select
          label="Atendido por"
          name="ownerId"
          options={team.map((u) => ({ value: u.id, label: u.name }))}
          defaultValue={lead?.ownerId}
          empty="Sem responsável"
        />
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Negociação</legend>
        {/* Na edição, a temperatura muda pelo seletor rápido ao lado do formulário. */}
        {!lead && <Select label="Temperatura" name="temperature" options={temperatures} defaultValue="morno" />}
        <Select label="Status" name="status" options={leadStatuses} defaultValue={lead?.status ?? "novo"} />
        <Select label="Serviço de interesse" name="service" options={serviceOptions} defaultValue={lead?.service} empty="Não definido" />
        <Select label="Origem" name="source" options={leadSources} defaultValue={lead?.source ?? "site"} />
        <Select
          label="Campanha"
          name="campaignId"
          options={campaigns.map((c) => ({ value: c.id, label: c.name }))}
          defaultValue={lead?.campaignId}
          empty="Nenhuma"
        />
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Detalhes</legend>
        <TextArea label="Mensagem / pedido" name="message" defaultValue={lead?.message} wide />
        <TextArea label="Anotações internas" name="notes" defaultValue={lead?.notes} wide rows={5} placeholder="Histórico de conversas, próximos passos..." />
      </fieldset>
    </>
  );
}
