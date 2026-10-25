"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { bulkEntries, type BulkAction, type BulkInput } from "@/app/admin/_actions/finance";
import { bulkExpenses } from "@/app/admin/_actions/expenses";
import { paymentMethods } from "@/lib/admin/options";
import type { FormState } from "@/lib/admin/form";

/** Dados de cada linha para exportar (CSV) e compartilhar (texto). */
export type BulkRow = { id: string; csv: Record<string, string>; share: string };

type EntryAction = BulkAction;
type ExpenseAction = "encerrar" | "reativar" | "excluir";

type Props = {
  scope: "entries" | "expenses";
  rows: BulkRow[];
  /** Ações que fazem sentido nesta lista, na ordem exibida. */
  actions: (EntryAction | ExpenseAction)[];
  /** Título do texto compartilhado e nome do arquivo exportado. */
  title: string;
  /** Página de detalhe (com 1 item selecionado aparece "Abrir"). */
  hrefBase: string;
  categories?: string[];
  accounts?: string[];
  /** Nível do perfil no módulo: 1 = só compartilhar/exportar, 2 = ações, 3 = também excluir. */
  level?: number;
  /** Mostrado no lugar da tabela quando não há linhas (a barra continua, com o resultado da última ação). */
  empty?: ReactNode;
  children: ReactNode;
};

type Ctx = { selected: Set<string>; toggle: (id: string) => void; toggleAll: () => void; all: string[] };
const SelectionContext = createContext<Ctx | null>(null);

const labels: Record<string, string> = {
  baixa: "Dar baixa",
  reabrir: "Desfazer baixa",
  cobrar: "Gerar boleto/Pix",
  email: "Enviar por e-mail",
  editar: "Editar",
  cancelar: "Cancelar",
  excluir: "Excluir",
  encerrar: "Encerrar",
  reativar: "Reativar",
};

const confirms: Record<string, string> = {
  excluir: "Excluir definitivamente os itens selecionados?",
  cancelar: "Cancelar os lançamentos selecionados? Cobranças no Asaas também são canceladas.",
  encerrar: "Encerrar as despesas selecionadas? As contas em aberto de hoje em diante saem de contas a pagar.",
  email: "Enviar a cobrança por e-mail para o cliente de cada lançamento selecionado?",
  cobrar: "Gerar boleto/Pix no Asaas para os lançamentos selecionados?",
  reabrir: "Desfazer a baixa dos lançamentos selecionados?",
};

const today = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);

function toCsv(rows: BulkRow[]) {
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r.csv)))];
  const cell = (v: string) => (/[";\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return "﻿" + [cols.map(cell).join(";"), ...rows.map((r) => cols.map((c) => cell(r.csv[c] ?? "")).join(";"))].join("\r\n");
}

export default function BulkTable({ scope, rows, actions: allActions, title, hrefBase, categories = [], accounts = [], level = 3, empty, children }: Props) {
  const actions = allActions.filter((a) => (a === "excluir" ? level >= 3 : level >= 2));
  const router = useRouter();
  const all = useMemo(() => rows.map((r) => r.id), [rows]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<FormState>({});
  const [dialog, setDialog] = useState<"baixa" | "editar" | null>(null);
  const [pending, startTransition] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Linhas que saíram da lista (filtro, exclusão) deixam a seleção.
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => all.includes(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [all]);

  useEffect(() => {
    if (dialog) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [dialog]);

  const ctx: Ctx = {
    selected,
    all,
    toggle: (id) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    toggleAll: () => setSelected((prev) => (prev.size === all.length ? new Set() : new Set(all))),
  };

  const chosen = rows.filter((r) => selected.has(r.id));

  function run(action: EntryAction | ExpenseAction, input?: BulkInput) {
    if (confirms[action] && !window.confirm(confirms[action])) return;
    const ids = [...selected];
    startTransition(async () => {
      let result: FormState;
      try {
        result = scope === "expenses" ? await bulkExpenses(action as ExpenseAction, ids) : await bulkEntries(action as EntryAction, ids, input);
      } catch {
        // Queda de conexão no meio do lote: parte pode ter sido feita. Repetir é seguro (o que já foi feito é ignorado).
        result = { error: "A conexão caiu no meio da ação. Confira a lista e tente de novo: o que já foi feito é ignorado." };
      }
      setMessage(result);
      setDialog(null);
      if (!result.error) setSelected(new Set());
      router.refresh();
    });
  }

  function shareText() {
    return [title, "", ...chosen.map((r) => `• ${r.share}`)].join("\n");
  }

  async function share() {
    const text = shareText();
    try {
      if (navigator.share) {
        await navigator.share({ title, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setMessage({ success: "Resumo copiado. Cole onde quiser compartilhar." });
    } catch {
      /* compartilhamento cancelado */
    }
  }

  function exportCsv() {
    const blob = new Blob([toCsv(chosen.length ? chosen : rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // Nome do arquivo: só a parte do título antes do " — " (ex.: "contas-a-pagar-2026-10-24.csv").
    const name = title.split(" — ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    a.download = `${name || "exportacao"}-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function submitDialog(form: HTMLFormElement) {
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    run(dialog === "baixa" ? "baixa" : "editar", data);
  }

  return (
    <SelectionContext.Provider value={ctx}>
      <div className={`adm-bulk ${selected.size > 0 ? "open" : ""}`} role="region" aria-label="Ações da seleção" aria-live="polite">
        {selected.size > 0 ? (
          <>
            <span className="adm-bulk-count">
              <strong>{selected.size}</strong> selecionado{selected.size === 1 ? "" : "s"}
              <button type="button" className="adm-link-btn" onClick={() => setSelected(new Set())}>
                Limpar
              </button>
            </span>
            <div className="adm-bulk-actions">
              {selected.size === 1 && (
                <Link href={`${hrefBase}/${[...selected][0]}`} className="adm-btn ghost small">
                  Abrir
                </Link>
              )}
              {actions
                .filter((a) => a !== "excluir" && a !== "cancelar" && a !== "encerrar")
                .map((a) => (
                  <button
                    key={a}
                    type="button"
                    className="adm-btn ghost small"
                    disabled={pending}
                    onClick={() => (a === "baixa" || a === "editar" ? setDialog(a) : run(a))}
                  >
                    {labels[a]}
                  </button>
                ))}
              <button type="button" className="adm-btn ghost small" onClick={share} disabled={pending}>
                Compartilhar
              </button>
              <a
                className="adm-btn ghost small"
                href={`https://wa.me/?text=${encodeURIComponent(shareText())}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
              <button type="button" className="adm-btn ghost small" onClick={exportCsv} disabled={pending}>
                Exportar CSV
              </button>
              {actions
                .filter((a) => a === "excluir" || a === "cancelar" || a === "encerrar")
                .map((a) => (
                  <button key={a} type="button" className="adm-btn danger ghost small" disabled={pending} onClick={() => run(a)}>
                    {labels[a]}
                  </button>
                ))}
            </div>
          </>
        ) : rows.length > 0 ? (
          <span className="adm-bulk-hint">
            Marque as linhas para agir em várias de uma vez.
            <button type="button" className="adm-link-btn" onClick={exportCsv}>
              Exportar tudo (CSV)
            </button>
          </span>
        ) : null}
        {pending && <span className="adm-bulk-pending">Processando...</span>}
        {(message.error || message.success) && !pending && (
          <p role="status" className={`adm-msg ${message.error ? "error" : "ok"}`}>
            {message.error ?? message.success}
          </p>
        )}
      </div>

      {rows.length === 0 ? empty : children}

      <dialog ref={dialogRef} className="adm-dialog" onClose={() => setDialog(null)} aria-labelledby="bulk-dialog-title">
        {dialog && (
          <form
            method="dialog"
            className="adm-form"
            onSubmit={(e) => {
              e.preventDefault();
              submitDialog(e.currentTarget);
            }}
          >
            <h2 id="bulk-dialog-title">
              {dialog === "baixa" ? "Dar baixa" : "Editar"} em {selected.size} lançamento{selected.size === 1 ? "" : "s"}
            </h2>
            {dialog === "editar" && <p className="adm-card-sub">Só os campos preenchidos são alterados.</p>}
            <div className="adm-form-grid">
              {dialog === "baixa" ? (
                <label className="adm-field">
                  <span className="adm-label">Data do pagamento</span>
                  <input type="date" name="paidAt" defaultValue={today()} required />
                </label>
              ) : (
                <label className="adm-field">
                  <span className="adm-label">Novo vencimento</span>
                  <input type="date" name="dueDate" />
                </label>
              )}
              <label className="adm-field">
                <span className="adm-label">Forma de pagamento</span>
                <select name="method" defaultValue={dialog === "baixa" ? "pix" : ""}>
                  {dialog === "editar" && <option value="">Manter</option>}
                  {paymentMethods.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="adm-field">
                <span className="adm-label">Conta {dialog === "baixa" ? "(para onde foi / de onde saiu)" : ""}</span>
                <input name="account" list="bulk-accounts" placeholder="Ex.: Asaas, Nubank PJ" />
                <datalist id="bulk-accounts">
                  {accounts.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </label>
              {dialog === "editar" && categories.length > 0 && (
                <label className="adm-field">
                  <span className="adm-label">Categoria</span>
                  <select name="category" defaultValue="">
                    <option value="">Manter</option>
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="adm-form-footer">
              <button type="submit" className="adm-btn" disabled={pending}>
                {pending ? "Salvando..." : dialog === "baixa" ? "Confirmar baixa" : "Aplicar"}
              </button>
              <button type="button" className="adm-btn ghost" onClick={() => setDialog(null)}>
                Voltar
              </button>
            </div>
          </form>
        )}
      </dialog>
    </SelectionContext.Provider>
  );
}

/** Caixa "selecionar todos" (no cabeçalho da primeira coluna). */
export function SelectAll() {
  const ctx = useContext(SelectionContext);
  const ref = useRef<HTMLInputElement>(null);
  const count = ctx?.selected.size ?? 0;
  const total = ctx?.all.length ?? 0;
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = count > 0 && count < total;
  }, [count, total]);
  if (!ctx) return null;
  return (
    <input
      ref={ref}
      type="checkbox"
      className="adm-row-check"
      checked={total > 0 && count === total}
      onChange={ctx.toggleAll}
      aria-label="Selecionar todos"
    />
  );
}

/** Caixa de seleção de uma linha. */
export function RowCheck({ id, label }: { id: string; label: string }) {
  const ctx = useContext(SelectionContext);
  if (!ctx) return null;
  return <input type="checkbox" className="adm-row-check" checked={ctx.selected.has(id)} onChange={() => ctx.toggle(id)} aria-label={`Selecionar ${label}`} />;
}
