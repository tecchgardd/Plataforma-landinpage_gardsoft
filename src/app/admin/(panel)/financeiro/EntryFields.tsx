import { Input, Select, TextArea } from "@/components/admin/Fields";
import { fromDbDate } from "@/lib/prisma";
import { moneyInput } from "@/lib/admin/format";
import { expenseCategories, incomeCategories, paymentMethods } from "@/lib/admin/options";

type Entry = {
  type: string;
  description: string;
  category: string;
  amountCents: number;
  dueDate: Date;
  method: string | null;
  clientId: string | null;
  projectId: string | null;
  supplier: string | null;
  notes: string | null;
};

type Option = { id: string; name: string; company?: string | null };

export default function EntryFields({
  type,
  entry,
  clients,
  projects,
  isNew,
}: {
  type: "receber" | "pagar";
  entry?: Entry;
  clients: Option[];
  projects: Option[];
  isNew: boolean;
}) {
  const categories = (type === "receber" ? incomeCategories : expenseCategories).map((c) => ({ value: c, label: c }));
  return (
    <>
      <input type="hidden" name="type" value={type} />
      <fieldset className="adm-fieldset">
        <legend>{type === "receber" ? "Conta a receber" : "Conta a pagar"}</legend>
        <Input label="Descrição" name="description" defaultValue={entry?.description} required wide placeholder={type === "receber" ? "Ex.: Manutenção mensal do site" : "Ex.: Hospedagem Vercel"} />
        <Select label="Categoria" name="category" options={categories} defaultValue={entry?.category ?? categories[0].value} />
        <Input label="Valor (R$)" name="amount" inputMode="decimal" placeholder="0,00" defaultValue={moneyInput(entry?.amountCents)} required />
        <Input label={isNew ? "Vencimento (1ª parcela)" : "Vencimento"} name="dueDate" type="date" defaultValue={fromDbDate(entry?.dueDate) ?? ""} required />
        <Select label="Forma de pagamento" name="method" options={paymentMethods} defaultValue={entry?.method} empty="A definir" />
        {type === "receber" ? (
          <Select
            label="Cliente"
            name="clientId"
            options={clients.map((c) => ({ value: c.id, label: c.company ? `${c.company} (${c.name})` : c.name }))}
            defaultValue={entry?.clientId}
            empty="Sem cliente"
            hint="Necessário para gerar boleto/Pix e nota fiscal."
          />
        ) : (
          <Input label="Fornecedor" name="supplier" defaultValue={entry?.supplier} placeholder="Ex.: Vercel, Google, contador" />
        )}
        <Select label="Projeto" name="projectId" options={projects.map((p) => ({ value: p.id, label: p.name }))} defaultValue={entry?.projectId} empty="Sem projeto" />
      </fieldset>
      {isNew && (
        <fieldset className="adm-fieldset">
          <legend>Repetição</legend>
          <Select
            label="Tipo"
            name="repeatMode"
            options={[
              { value: "mensal", label: "Repetir o mesmo valor todo mês (recorrente)" },
              { value: "parcelas", label: "Dividir o valor em parcelas mensais" },
            ]}
            defaultValue="mensal"
          />
          <Input label="Quantidade de meses / parcelas" name="repeat" inputMode="decimal" defaultValue="1" hint="1 = lançamento único." />
        </fieldset>
      )}
      <fieldset className="adm-fieldset">
        <legend>Observações</legend>
        <TextArea label="Anotações" name="notes" defaultValue={entry?.notes} wide rows={3} />
      </fieldset>
    </>
  );
}
