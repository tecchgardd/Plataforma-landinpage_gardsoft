"use client";

import { useState } from "react";
import { expenseFrequencies, expenseTypes, paymentMethods } from "@/lib/admin/options";

export type ExpenseValues = {
  name: string;
  kind: string;
  supplier: string | null;
  amount: string;
  frequency: string;
  dueDay: number | null;
  startMonth: string;
  dueDate: string;
  endMonth: string;
  method: string | null;
  account: string | null;
  url: string | null;
  notes: string | null;
};

const groups = [...new Set(expenseTypes.map((t) => t.group))];

function Field({ label, hint, wide, children }: { label: string; hint?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`adm-field ${wide ? "wide" : ""}`}>
      <span className="adm-label">{label}</span>
      {children}
      {hint && <small className="adm-hint">{hint}</small>}
    </label>
  );
}

/** Campos da despesa: o vencimento muda conforme a periodicidade (dia do mês, data anual ou data única). */
export default function ExpenseFields({ values, accounts }: { values: ExpenseValues; accounts: string[] }) {
  const [kind, setKind] = useState(values.kind);
  const [frequency, setFrequency] = useState(values.frequency);
  const hint = expenseTypes.find((t) => t.value === kind);

  return (
    <>
      <fieldset className="adm-fieldset">
        <legend>O que é</legend>
        <Field label="Nome da despesa">
          <input name="name" defaultValue={values.name} required maxLength={120} placeholder="Ex.: Claude Pro, Vercel Pro, domínio gardsoft.com.br" />
        </Field>
        <Field label="Tipo" hint={hint && "hint" in hint ? `Ex.: ${hint.hint}` : undefined}>
          <select name="kind" value={kind} onChange={(e) => setKind(e.target.value)} required>
            {groups.map((g) => (
              <optgroup key={g} label={g}>
                {expenseTypes
                  .filter((t) => t.group === g)
                  .map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </Field>
        <Field label="Fornecedor / empresa">
          <input name="supplier" defaultValue={values.supplier ?? ""} maxLength={120} placeholder="Ex.: Anthropic, Vercel, Registro.br" />
        </Field>
        <Field label="Valor (R$)" hint={frequency === "anual" ? "Valor cobrado por ano." : frequency === "mensal" ? "Valor cobrado por mês." : undefined}>
          <input name="amount" inputMode="decimal" defaultValue={values.amount} required placeholder="0,00" />
        </Field>
      </fieldset>

      <fieldset className="adm-fieldset">
        <legend>Quando vence</legend>
        <Field label="Periodicidade">
          <select name="frequency" value={frequency} onChange={(e) => setFrequency(e.target.value)}>
            {expenseFrequencies.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
        {frequency === "mensal" && (
          <>
            <Field label="Dia do vencimento" hint="Todo mês neste dia. Dia 31 vira o último dia nos meses curtos.">
              <input name="dueDay" type="number" min={1} max={31} defaultValue={values.dueDay ?? ""} required />
            </Field>
            <Field label="Primeira cobrança em" hint="A partir deste mês as contas entram em contas a pagar.">
              <input name="startMonth" type="month" defaultValue={values.startMonth} required />
            </Field>
          </>
        )}
        {frequency === "anual" && (
          <Field label="Próximo vencimento" hint="Repete todo ano nesta data.">
            <input name="dueDate" type="date" defaultValue={values.dueDate} required />
          </Field>
        )}
        {frequency === "unica" && (
          <Field label="Vencimento">
            <input name="dueDate" type="date" defaultValue={values.dueDate} required />
          </Field>
        )}
        {frequency !== "unica" && (
          <Field label="Termina em (opcional)" hint="Deixe em branco para repetir até você encerrar.">
            <input name="endMonth" type="month" defaultValue={values.endMonth} />
          </Field>
        )}
      </fieldset>

      <fieldset className="adm-fieldset">
        <legend>Como é pago</legend>
        <Field label="Forma de pagamento">
          <select name="method" defaultValue={values.method ?? ""}>
            <option value="">A definir</option>
            {paymentMethods.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Conta / cartão">
          <input name="account" list="expense-accounts" defaultValue={values.account ?? ""} maxLength={80} placeholder="Ex.: Cartão Nubank final 1234" />
          <datalist id="expense-accounts">
            {accounts.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </Field>
        <Field label="Link do painel / fatura" wide>
          <input name="url" type="url" defaultValue={values.url ?? ""} placeholder="https://..." />
        </Field>
        <Field label="Observações" wide>
          <textarea name="notes" rows={3} defaultValue={values.notes ?? ""} placeholder="Plano contratado, login de quem usa, para que serve..." />
        </Field>
      </fieldset>
    </>
  );
}
