"use client";

import { useState } from "react";
import { costTypes } from "@/lib/admin/options";

type Cost = { type: string; description: string; amount: string };

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function toCents(input: string) {
  const cleaned = input.replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.max(0, Math.round(value * 100)) : 0;
}

/** Itens de investimento da campanha; o total é a soma. Envia tudo num campo oculto "costs" (JSON). */
export default function CostsEditor({ initial }: { initial: { type: string; description: string | null; amountCents: number }[] }) {
  const [rows, setRows] = useState<Cost[]>(
    initial.length
      ? initial.map((c) => ({ type: c.type, description: c.description ?? "", amount: (c.amountCents / 100).toFixed(2).replace(".", ",") }))
      : [{ type: "trafego", description: "", amount: "" }],
  );
  const set = (i: number, patch: Partial<Cost>) => setRows((r) => r.map((row, j) => (j === i ? { ...row, ...patch } : row)));
  const total = rows.reduce((s, r) => s + toCents(r.amount), 0);
  const payload = JSON.stringify(rows.map((r) => ({ type: r.type, description: r.description, amountCents: toCents(r.amount) })));

  return (
    <div className="adm-costs wide">
      <input type="hidden" name="costs" value={payload} />
      <div className="adm-costs-head" aria-hidden="true">
        <span>Tipo de investimento</span>
        <span>Descrição</span>
        <span>Valor (R$)</span>
        <span />
      </div>
      {rows.map((row, i) => (
        <div key={i} className="adm-costs-row">
          <select value={row.type} onChange={(e) => set(i, { type: e.target.value })} aria-label="Tipo de investimento">
            {costTypes.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <input
            value={row.description}
            onChange={(e) => set(i, { description: e.target.value })}
            placeholder="Ex.: Meta Ads — público local / 2.000 flyers"
            maxLength={200}
            aria-label="Descrição"
          />
          <input
            value={row.amount}
            onChange={(e) => set(i, { amount: e.target.value })}
            inputMode="decimal"
            placeholder="0,00"
            aria-label="Valor"
          />
          <button type="button" className="adm-icon-btn danger" aria-label="Remover investimento" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
            ×
          </button>
        </div>
      ))}
      <div className="adm-costs-foot">
        <button type="button" className="adm-btn ghost small" onClick={() => setRows((r) => [...r, { type: "trafego", description: "", amount: "" }])}>
          + Adicionar investimento
        </button>
        <span>
          Total investido <strong>{brl.format(total / 100)}</strong>
        </span>
      </div>
    </div>
  );
}
