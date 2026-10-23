"use client";

import { useState } from "react";

type Row = { label: string; amount: string; dueDate: string };

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function toCents(input: string) {
  const cleaned = input.replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.max(0, Math.round(value * 100)) : 0;
}
const fromCents = (c: number) => (c / 100).toFixed(2).replace(".", ",");

function addDays(days: number) {
  return new Date(Date.now() - 3 * 3600e3 + days * 864e5).toISOString().slice(0, 10);
}
function addMonths(iso: string, n: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + n, Math.min(d, 28)));
  return date.toISOString().slice(0, 10);
}

/** Plano de pagamento do contrato. O total do contrato é a soma das parcelas. */
export default function PlanEditor({
  initial,
  suggestedTotal,
}: {
  initial: { label: string; amountCents: number; dueDate: string }[];
  suggestedTotal: number;
}) {
  const [rows, setRows] = useState<Row[]>(
    initial.length
      ? initial.map((r) => ({ label: r.label, amount: fromCents(r.amountCents), dueDate: r.dueDate }))
      : [
          { label: "Entrada (50%)", amount: fromCents(Math.round(suggestedTotal / 2)), dueDate: addDays(3) },
          { label: "Entrega (50%)", amount: fromCents(suggestedTotal - Math.round(suggestedTotal / 2)), dueDate: addDays(33) },
        ],
  );
  const [total, setTotal] = useState(fromCents(suggestedTotal || rows.reduce((s, r) => s + toCents(r.amount), 0)));
  const sum = rows.reduce((s, r) => s + toCents(r.amount), 0);
  const payload = JSON.stringify(rows.map((r) => ({ label: r.label.trim(), amountCents: toCents(r.amount), dueDate: r.dueDate })));
  const set = (i: number, patch: Partial<Row>) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  function preset(kind: "avista" | "metade" | "tres") {
    const t = toCents(total);
    if (!t) return;
    const first = addDays(3);
    if (kind === "avista") setRows([{ label: "Pagamento à vista", amount: fromCents(t), dueDate: first }]);
    if (kind === "metade")
      setRows([
        { label: "Entrada (50%)", amount: fromCents(Math.round(t / 2)), dueDate: first },
        { label: "Entrega (50%)", amount: fromCents(t - Math.round(t / 2)), dueDate: addMonths(first, 1) },
      ]);
    if (kind === "tres") {
      const part = Math.floor(t / 3);
      setRows(
        [0, 1, 2].map((i) => ({
          label: `Parcela ${i + 1}/3`,
          amount: fromCents(i === 2 ? t - part * 2 : part),
          dueDate: addMonths(first, i),
        })),
      );
    }
  }

  return (
    <div className="adm-plan wide">
      <input type="hidden" name="paymentPlan" value={payload} />
      <div className="adm-plan-presets">
        <label>
          <span className="adm-label">Valor total (R$)</span>
          <input value={total} onChange={(e) => setTotal(e.target.value)} inputMode="decimal" placeholder="0,00" />
        </label>
        <div>
          <span className="adm-label">Montar parcelas</span>
          <div className="adm-plan-buttons">
            <button type="button" className="adm-btn ghost small" onClick={() => preset("avista")}>
              À vista
            </button>
            <button type="button" className="adm-btn ghost small" onClick={() => preset("metade")}>
              50% + 50%
            </button>
            <button type="button" className="adm-btn ghost small" onClick={() => preset("tres")}>
              3x mensais
            </button>
          </div>
        </div>
      </div>
      <div className="adm-costs-head" aria-hidden="true">
        <span>Parcela</span>
        <span>Vencimento</span>
        <span>Valor (R$)</span>
        <span />
      </div>
      {rows.map((row, i) => (
        <div key={i} className="adm-costs-row">
          <input value={row.label} onChange={(e) => set(i, { label: e.target.value })} aria-label="Descrição da parcela" maxLength={60} />
          <input type="date" value={row.dueDate} onChange={(e) => set(i, { dueDate: e.target.value })} aria-label="Vencimento" />
          <input value={row.amount} onChange={(e) => set(i, { amount: e.target.value })} inputMode="decimal" aria-label="Valor" />
          <button type="button" className="adm-icon-btn danger" aria-label="Remover parcela" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <div className="adm-costs-foot">
        <button
          type="button"
          className="adm-btn ghost small"
          onClick={() => setRows((r) => [...r, { label: `Parcela ${r.length + 1}`, amount: "", dueDate: addMonths(r.at(-1)?.dueDate ?? addDays(3), 1) }])}
        >
          + Adicionar parcela
        </button>
        <span>
          Total do contrato <strong>{brl.format(sum / 100)}</strong>
          {toCents(total) > 0 && toCents(total) !== sum && <em className="adm-plan-diff"> (difere de {brl.format(toCents(total) / 100)})</em>}
        </span>
      </div>
    </div>
  );
}
