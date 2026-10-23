import { Input, Select, TextArea } from "@/components/admin/Fields";
import PlanEditor from "./PlanEditor";

type Option = { id: string; name: string; company?: string | null };

export type ContractFormData = {
  title: string;
  clientId: string;
  projectId: string | null;
  scope: string;
  clauses: string;
  deliveryDays: number | null;
  valueCents: number;
  paymentPlan: { label: string; amountCents: number; dueDate: string }[];
};

export default function ContractFields({
  contract,
  clients,
  projects,
}: {
  contract: ContractFormData;
  clients: Option[];
  projects: Option[];
}) {
  return (
    <>
      <fieldset className="adm-fieldset">
        <legend>Contrato</legend>
        <Input label="Título" name="title" defaultValue={contract.title} required wide placeholder="Ex.: Desenvolvimento de site institucional" />
        <Select
          label="Cliente (contratante)"
          name="clientId"
          options={clients.map((c) => ({ value: c.id, label: c.company ? `${c.company} (${c.name})` : c.name }))}
          defaultValue={contract.clientId}
          empty="Escolha o cliente"
          hint="Os dados do contrato (CPF/CNPJ, endereço) vêm do cadastro do cliente."
        />
        <Select
          label="Projeto"
          name="projectId"
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
          defaultValue={contract.projectId}
          empty="Sem projeto vinculado"
        />
        <Input
          label="Prazo de entrega (dias)"
          name="deliveryDays"
          inputMode="decimal"
          defaultValue={contract.deliveryDays ? String(contract.deliveryDays) : ""}
          placeholder="Ex.: 30"
        />
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Escopo do projeto</legend>
        <TextArea
          label="O que será entregue"
          name="scope"
          defaultValue={contract.scope}
          wide
          rows={9}
          placeholder={"Liste páginas, funcionalidades, integrações e o que NÃO está incluso.\nEx.:\n- Site com 5 páginas: Home, Sobre, Serviços, Equipe e Contato\n- Formulário de contato com envio para WhatsApp\n- Não incluso: textos e fotos profissionais"}
        />
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Valor e plano de pagamento</legend>
        <PlanEditor initial={contract.paymentPlan} suggestedTotal={contract.valueCents} />
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Cláusulas</legend>
        <TextArea
          label="Cláusulas do contrato"
          name="clauses"
          defaultValue={contract.clauses}
          wide
          rows={16}
          hint="Variáveis substituídas automaticamente: {contratante}, {contratada}, {valor}, {prazo}, {foro}. O modelo padrão fica em Financeiro → Configurações."
        />
      </fieldset>
    </>
  );
}
