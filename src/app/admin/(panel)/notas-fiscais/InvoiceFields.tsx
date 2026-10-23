import { Input, Select, TextArea } from "@/components/admin/Fields";
import { moneyInput } from "@/lib/admin/format";

type Option = { id: string; name: string; company?: string | null };
type EntryOption = { id: string; description: string; amountCents: number };

export type InvoiceFormData = {
  number: string | null;
  series: string | null;
  status: string;
  issueDate: string | null;
  amountCents: number;
  issCents: number | null;
  description: string;
  verificationCode: string | null;
  clientId: string | null;
  entryId: string | null;
  notes: string | null;
};

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Nota emitida fora do Asaas: número, valores, tomador e os arquivos da prefeitura. */
export default function InvoiceFields({
  invoice,
  clients,
  entries,
  withFiles,
}: {
  invoice: InvoiceFormData;
  clients: Option[];
  entries: EntryOption[];
  withFiles: boolean;
}) {
  return (
    <>
      <fieldset className="adm-fieldset">
        <legend>Nota fiscal</legend>
        <Input label="Número" name="number" defaultValue={invoice.number} placeholder="Ex.: 1234" />
        <Input label="Série" name="series" defaultValue={invoice.series} placeholder="Opcional" />
        <Select
          label="Situação"
          name="status"
          options={[
            { value: "emitida", label: "Emitida" },
            { value: "pendente", label: "Pendente (ainda vou emitir)" },
          ]}
          defaultValue={invoice.status === "pendente" ? "pendente" : "emitida"}
        />
        <Input label="Data de emissão" name="issueDate" type="date" defaultValue={invoice.issueDate} />
        <Input label="Valor dos serviços (R$)" name="amount" inputMode="decimal" defaultValue={moneyInput(invoice.amountCents)} required />
        <Input label="ISS (R$)" name="iss" inputMode="decimal" defaultValue={moneyInput(invoice.issCents)} placeholder="Opcional" />
        <Input label="Código de verificação" name="verificationCode" defaultValue={invoice.verificationCode} wide placeholder="Código da prefeitura, para consulta da nota" />
        <TextArea label="Discriminação do serviço" name="description" defaultValue={invoice.description} wide rows={3} />
      </fieldset>
      <fieldset className="adm-fieldset">
        <legend>Vínculos</legend>
        <Select
          label="Tomador (cliente)"
          name="clientId"
          options={clients.map((c) => ({ value: c.id, label: c.company ? `${c.company} (${c.name})` : c.name }))}
          defaultValue={invoice.clientId}
          empty="Sem cliente vinculado"
        />
        <Select
          label="Recebimento"
          name="entryId"
          options={entries.map((e) => ({ value: e.id, label: `${e.description} · ${brl.format(e.amountCents / 100)}` }))}
          defaultValue={invoice.entryId}
          empty="Sem lançamento vinculado"
          hint="Conta a receber paga a que esta nota se refere."
        />
        <TextArea label="Observações" name="notes" defaultValue={invoice.notes} wide rows={2} />
      </fieldset>
      {withFiles && (
        <fieldset className="adm-fieldset">
          <legend>Arquivos da prefeitura</legend>
          <label className="adm-field">
            <span className="adm-label">PDF da nota</span>
            <input type="file" name="pdf" accept=".pdf" />
          </label>
          <label className="adm-field">
            <span className="adm-label">XML da nota</span>
            <input type="file" name="xml" accept=".xml" />
          </label>
        </fieldset>
      )}
    </>
  );
}
