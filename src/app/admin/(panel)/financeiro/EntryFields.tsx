import { Input, Select, TextArea } from "@/components/admin/Fields";
import { fromDbDate } from "@/lib/prisma";
import { moneyInput } from "@/lib/admin/format";
import { expenseTypes, incomeCategories, paymentMethods } from "@/lib/admin/options";

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
  account: string | null;
  notes: string | null;
};

type Option = { id: string; name: string; company?: string | null };

export default function EntryFields({
  type,
  entry,
  clients,
  projects,
  isNew,
  extra,
}: {
  type: "receber" | "pagar";
  entry?: Entry;
  clients: Option[];
  projects: Option[];
  isNew: boolean;
  extra?: React.ReactNode;
}) {
  const names: string[] = type === "receber" ? [...incomeCategories] : expenseTypes.map((t) => t.label);
  // Lançamentos antigos podem ter uma categoria que saiu da lista: mantém a atual como opção.
  if (entry?.category && !names.includes(entry.category)) names.unshift(entry.category);
  const categories = names.map((c) => ({ value: c, label: c }));
  const isIncome = type === "receber";
  return (
    <>
      <input type="hidden" name="type" value={type} />
      <fieldset className="adm-fieldset">
        <legend>{isIncome ? "Cobrança" : "Conta a pagar"}</legend>
        <Select label={isIncome ? "O que está sendo cobrado" : "Tipo"} name="category" options={categories} defaultValue={entry?.category ?? categories[0].value} />
        <Input
          label="Descrição"
          name="description"
          defaultValue={entry?.description}
          required
          placeholder={isIncome ? "Ex.: Site institucional — Padaria Sol" : "Ex.: Vercel Pro"}
        />
        {isIncome ? (
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
        <Input label="Valor (R$)" name="amount" inputMode="decimal" placeholder="0,00" defaultValue={moneyInput(entry?.amountCents)} required />
        <Input label={isNew ? "Vencimento (1º)" : "Vencimento"} name="dueDate" type="date" defaultValue={fromDbDate(entry?.dueDate) ?? ""} required />
        <Select label="Forma de pagamento" name="method" options={paymentMethods} defaultValue={entry?.method} empty="A definir" />
        <Input
          label={isIncome ? "Conta de recebimento" : "Conta / cartão de pagamento"}
          name="account"
          defaultValue={entry?.account}
          placeholder={isIncome ? "Ex.: Asaas, Nubank PJ" : "Ex.: Cartão Nubank final 1234"}
        />
      </fieldset>
      {isNew && isIncome && (
        <fieldset className="adm-fieldset">
          <legend>Repetição</legend>
          <Select
            label="Tipo"
            name="repeatMode"
            options={[
              { value: "mensal", label: "Repetir o mesmo valor todo mês (manutenção, hospedagem)" },
              { value: "parcelas", label: "Dividir o valor em parcelas mensais" },
            ]}
            defaultValue="mensal"
          />
          <Input label="Quantidade de meses / parcelas" name="repeat" inputMode="decimal" defaultValue="1" hint="1 = cobrança única." />
        </fieldset>
      )}
      {extra}
      <fieldset className="adm-fieldset">
        <legend>Observações</legend>
        <TextArea label="Anotações" name="notes" defaultValue={entry?.notes} wide rows={3} />
      </fieldset>
    </>
  );
}
