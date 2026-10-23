import { Input, Select, TextArea } from "@/components/admin/Fields";
import ItemsEditor from "./ItemsEditor";

type Option = { id: string; name: string; company?: string | null };

export type QuoteFormData = {
  title: string;
  clientId: string | null;
  leadId: string | null;
  projectId: string | null;
  intro: string | null;
  items: { description: string; details: string; quantity: number; unitCents: number }[];
  discountCents: number;
  validUntil: string | null;
  deliveryDays: number | null;
  paymentTerms: string | null;
  notes: string | null;
};

const label = (o: Option) => (o.company ? `${o.company} (${o.name})` : o.name);

export default function QuoteFields({
  quote,
  clients,
  leads,
  projects,
}: {
  quote: QuoteFormData;
  clients: Option[];
  leads: Option[];
  projects: Option[];
}) {
  return (
    <>
      <fieldset className="adm-fieldset">
        <legend>Orçamento</legend>
        <Input label="Título" name="title" defaultValue={quote.title} required wide placeholder="Ex.: Site institucional com blog" />
        <Select
          label="Cliente"
          name="clientId"
          options={clients.map((c) => ({ value: c.id, label: label(c) }))}
          defaultValue={quote.clientId}
          empty="Ainda não é cliente"
        />
        <Select
          label="Lead"
          name="leadId"
          options={leads.map((l) => ({ value: l.id, label: label(l) }))}
          defaultValue={quote.leadId}
          empty="Sem lead vinculado"
          hint="Para quem ainda não é cliente. Ao virar contrato, o cliente é criado a partir do lead."
        />
        <Select label="Projeto" name="projectId" options={projects.map((p) => ({ value: p.id, label: p.name }))} defaultValue={quote.projectId} empty="Sem projeto vinculado" />
        <TextArea label="Apresentação" name="intro" defaultValue={quote.intro} wide rows={3} placeholder="Contexto e objetivo da proposta." />
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Serviços e valores</legend>
        <ItemsEditor initial={quote.items} discountCents={quote.discountCents} />
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Condições</legend>
        <Input label="Válido até" name="validUntil" type="date" defaultValue={quote.validUntil} />
        <Input label="Prazo de entrega (dias)" name="deliveryDays" inputMode="decimal" defaultValue={quote.deliveryDays ? String(quote.deliveryDays) : ""} placeholder="Ex.: 30" />
        <TextArea label="Forma de pagamento" name="paymentTerms" defaultValue={quote.paymentTerms} wide rows={2} />
        <TextArea label="Observações" name="notes" defaultValue={quote.notes} wide rows={3} hint="O que não está incluso, garantias, suporte..." />
      </fieldset>
    </>
  );
}
