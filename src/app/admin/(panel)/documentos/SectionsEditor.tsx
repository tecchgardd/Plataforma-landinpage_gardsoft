"use client";

import { useState } from "react";
import type { DocSection } from "@/lib/documents";

type Row = DocSection & { key: number; hint?: string };

/**
 * Seções do documento: título + texto. Dá para incluir, remover e reordenar.
 * O conjunto vai num campo oculto "sections" (JSON) para a server action.
 */
export default function SectionsEditor({ initial, hints }: { initial: DocSection[]; hints: Record<string, string> }) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((s, i) => ({ ...s, key: i, hint: hints[s.title] })));
  const [nextKey, setNextKey] = useState(initial.length);

  const update = (key: number, patch: Partial<Row>) => setRows((r) => r.map((row) => (row.key === key ? { ...row, ...patch } : row)));
  const move = (index: number, delta: number) =>
    setRows((r) => {
      const next = [...r];
      const [item] = next.splice(index, 1);
      next.splice(index + delta, 0, item);
      return next;
    });

  return (
    <div className="adm-sections wide">
      <input type="hidden" name="sections" value={JSON.stringify(rows.map(({ title, body }) => ({ title, body })))} />
      {rows.map((row, i) => (
        <section key={row.key} className="adm-section-edit">
          <div className="adm-section-head">
            <span className="adm-section-num">{i + 1}</span>
            <input
              aria-label={`Título da seção ${i + 1}`}
              value={row.title}
              onChange={(e) => update(row.key, { title: e.target.value })}
              placeholder="Título da seção"
              maxLength={120}
              required
            />
            <div className="adm-section-tools">
              <button type="button" className="adm-icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir seção">
                ↑
              </button>
              <button type="button" className="adm-icon-btn" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="Descer seção">
                ↓
              </button>
              <button
                type="button"
                className="adm-icon-btn danger"
                onClick={() => (!row.body.trim() || window.confirm(`Remover a seção "${row.title}"?`)) && setRows((r) => r.filter((x) => x.key !== row.key))}
                aria-label="Remover seção"
              >
                ×
              </button>
            </div>
          </div>
          <textarea
            aria-label={`Texto da seção ${row.title}`}
            value={row.body}
            onChange={(e) => update(row.key, { body: e.target.value })}
            placeholder={row.hint ?? "Escreva aqui. Linhas começando com - viram lista."}
            rows={Math.min(16, Math.max(4, row.body.split("\n").length + 1))}
          />
        </section>
      ))}
      <button
        type="button"
        className="adm-btn ghost"
        onClick={() => {
          setRows((r) => [...r, { key: nextKey, title: "Nova seção", body: "" }]);
          setNextKey((k) => k + 1);
        }}
      >
        + Adicionar seção
      </button>
      <p className="adm-hint">Dica: deixe uma linha em branco entre parágrafos. Linhas começando com “- ” viram lista. Seções vazias saem como “Não se aplica”.</p>
    </div>
  );
}
