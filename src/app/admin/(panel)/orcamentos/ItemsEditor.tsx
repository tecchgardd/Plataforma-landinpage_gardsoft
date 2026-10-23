"use client";

import { useState } from "react";

type Row = { description: string; details: string; quantity: string; unit: string };

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function toCents(input: string) {
  const cleaned = input.replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.max(0, Math.round(value * 100)) : 0;
}
const toQty = (input: string) => Math.max(0, Number(input.replace(",", ".")) || 0);
const fromCents = (c: number) => (c ? (c / 100).toFixed(2).replace(".", ",") : "");
const empty: Row = { description: "", details: "", quantity: "1", unit: "" };

/** Itens do orçamento: descrição, detalhes do serviço, quantidade e valor unitário. O total é a soma menos o desconto. */
export default function ItemsEditor({
  initial,
  discountCents,
}: {
  initial: { description: string; details: string; quantity: number; unitCents: number }[];
  discountCents: number;
}) {
  const [rows, setRows] = useState<Row[]>(
    initial.length
      ? initial.map((r) => ({ description: r.description, details: r.details, quantity: String(r.quantity).replace(".", ","), unit: fromCents(r.unitCents) }))
      : [{ ...empty }],
  );
  const [discount, setDiscount] = useState(fromCents(discountCents));
  const lineTotal = (r: Row) => Math.round(toQty(r.quantity) * toCents(r.unit));
  const subtotal = rows.reduce((s, r) => s + lineTotal(r), 0);
  const total = Math.max(0, subtotal - toCents(discount));
  const payload = JSON.stringify(
    rows
      .filter((r) => r.description.trim())
      .map((r) => ({ description: r.description.trim(), details: r.details.trim(), quantity: toQty(r.quantity), unitCents: toCents(r.unit) })),
  );
  const set = (i: number, patch: Partial<Row>) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const move = (i: number, dir: -1 | 1) =>
    setRows((all) => {
      const next = [...all];
      const j = i + dir;
      if (j < 0 || j >= next.length) return all;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  return (
    <div className="adm-qitems wide">
      <input type="hidden" name="items" value={payload} />
      <input type="hidden" name="discount" value={discount} />
      {rows.map((row, i) => (
        <div key={i} className="adm-qitem">
          <span className="adm-qitem-n" aria-hidden="true">
            {i + 1}
          </span>
          <div className="adm-qitem-main">
            <input
              value={row.description}
              onChange={(e) => set(i, { description: e.target.value })}
              placeholder="Serviço (ex.: Landing page responsiva)"
              aria-label={`Descrição do item ${i + 1}`}
              maxLength={200}
            />
            <textarea
              value={row.details}
              onChange={(e) => set(i, { details: e.target.value })}
              placeholder="Detalhes do que está incluso (opcional)"
              aria-label={`Detalhes do item ${i + 1}`}
              rows={2}
              maxLength={2000}
            />
          </div>
          <label className="adm-qitem-num">
            <span>Qtd.</span>
            <input value={row.quantity} onChange={(e) => set(i, { quantity: e.target.value })} inputMode="decimal" />
          </label>
          <label className="adm-qitem-num">
            <span>Valor unit. (R$)</span>
            <input value={row.unit} onChange={(e) => set(i, { unit: e.target.value })} inputMode="decimal" placeholder="0,00" />
          </label>
          <div className="adm-qitem-total">
            <span>Total</span>
            <strong>{brl.format(lineTotal(row) / 100)}</strong>
          </div>
          <div className="adm-qitem-actions">
            <button type="button" className="adm-icon-btn" aria-label="Subir item" onClick={() => move(i, -1)} disabled={i === 0}>
              ↑
            </button>
            <button type="button" className="adm-icon-btn" aria-label="Descer item" onClick={() => move(i, 1)} disabled={i === rows.length - 1}>
              ↓
            </button>
            <button
              type="button"
              className="adm-icon-btn danger"
              aria-label="Remover item"
              onClick={() => setRows((r) => (r.length > 1 ? r.filter((_, j) => j !== i) : [{ ...empty }]))}
            >
              ×
            </button>
          </div>
        </div>
      ))}
      <div className="adm-qitems-foot">
        <button type="button" className="adm-btn ghost small" onClick={() => setRows((r) => [...r, { ...empty }])}>
          + Adicionar item
        </button>
        <dl className="adm-qitems-sum">
          <dt>Subtotal</dt>
          <dd>{brl.format(subtotal / 100)}</dd>
          <dt>
            <label htmlFor="quote-discount">Desconto (R$)</label>
          </dt>
          <dd>
            <input id="quote-discount" value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" placeholder="0,00" />
          </dd>
          <dt className="total">Total</dt>
          <dd className="total">{brl.format(total / 100)}</dd>
        </dl>
      </div>
    </div>
  );
}
