"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type CSSProperties, type DragEvent, type FormEvent } from "react";
import Avatar from "@/components/admin/Avatar";
import Dropdown, { MenuAction, MenuLabel, MenuSeparator } from "@/components/admin/Dropdown";
import { createColumn, deleteColumn, moveProjectTo, reorderColumns, updateColumn, type ColumnResult } from "../../_actions/projects";

export type Card = {
  id: string;
  name: string;
  stage: string;
  client: string | null;
  owner: { name: string; image: string | null } | null;
  /** Número do orçamento vinculado (os valores ficam só no documento). */
  quote: string | null;
  due: string | null;
  late: boolean;
  tasksDone: number;
  tasksTotal: number;
  files: number;
  github: string | null;
  preview: string | null;
};

export type Column = { id: string; name: string; wipLimit: number | null; done: boolean };

/** O que cada um pode fazer com a estrutura do quadro (nível 2 organiza, nível 3 exclui colunas). */
type Can = { move: boolean; manage: boolean; remove: boolean };

const svg = (d: string) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const icons = {
  edit: svg("M4 20h4L19 9l-4-4L4 16zM14 6l4 4"),
  left: svg("M15 6l-6 6 6 6"),
  right: svg("M9 6l6 6-6 6"),
  plus: svg("M12 5v14M5 12h14"),
  trash: svg("M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"),
};

/** Quadro Kanban: arraste os cards entre as colunas; as colunas são criadas e organizadas pela equipe. */
export default function Board({ columns: initialColumns, cards: initial, can }: { columns: Column[]; cards: Card[]; can: Can }) {
  const router = useRouter();
  const [cards, setCards] = useState(initial);
  const [columns, setColumns] = useState(initialColumns);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<{ stage: string; index: number } | null>(null);
  /** Coluna sendo arrastada pelo cabeçalho e a posição onde ela vai entrar. */
  const [dragCol, setDragCol] = useState<string | null>(null);
  const [colOver, setColOver] = useState<number | null>(null);
  /** Coluna aberta para edição, exclusão ou para inserir outra depois dela. */
  const [panel, setPanel] = useState<{ id: string; mode: "edit" | "delete" | "after" } | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => setCards(initial), [initial]);
  useEffect(() => setColumns(initialColumns), [initialColumns]);

  /** Roda a ação no servidor, mostra o erro (se houver) e recarrega o quadro. */
  function run(action: () => Promise<ColumnResult | void>, after?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) {
        setError(result.error);
        setColumns(initialColumns);
      } else after?.();
      router.refresh();
    });
  }

  function dropIndex(event: DragEvent<HTMLElement>, stage: string) {
    const list = event.currentTarget.querySelectorAll<HTMLElement>("[data-card]");
    let index = 0;
    for (const el of list) {
      if (el.dataset.card === dragging) continue;
      const rect = el.getBoundingClientRect();
      if (event.clientY > rect.top + rect.height / 2) index++;
    }
    return { stage, index };
  }

  function drop(stage: string) {
    if (!dragging || !over) return;
    const id = dragging;
    const index = over.index;
    setCards((prev) => {
      const card = prev.find((c) => c.id === id);
      if (!card) return prev;
      const rest = prev.filter((c) => c.id !== id);
      const inColumn = rest.filter((c) => c.stage === stage);
      const anchor = inColumn[index];
      const moved = { ...card, stage };
      const at = anchor ? rest.indexOf(anchor) : rest.length;
      return [...rest.slice(0, at), moved, ...rest.slice(at)];
    });
    setDragging(null);
    setOver(null);
    startTransition(async () => {
      await moveProjectTo(id, stage, index);
      router.refresh();
    });
  }

  /** Move a coluna `id` para a posição `to` (já na ordem nova) e salva. */
  function placeColumn(id: string, to: number) {
    const from = columns.findIndex((c) => c.id === id);
    if (from < 0 || to === from) return;
    const next = [...columns];
    const [moved] = next.splice(from, 1);
    next.splice(Math.max(0, Math.min(to, next.length)), 0, moved);
    setColumns(next);
    run(() => reorderColumns(next.map((c) => c.id)));
  }

  function columnDropIndex(event: DragEvent<HTMLElement>, index: number) {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientX > rect.left + rect.width / 2 ? index + 1 : index;
  }

  return (
    <>
      {error && (
        <p className="adm-msg error" role="alert">
          {error}
        </p>
      )}
      <div className={`adm-board ${pending ? "is-saving" : ""}`} style={{ "--cols": columns.length + (can.manage ? 1 : 0) } as CSSProperties}>
        {columns.map((column, i) => {
          const items = cards.filter((c) => c.stage === column.id);
          const full = column.wipLimit !== null && items.length >= column.wipLimit;
          const overLimit = column.wipLimit !== null && items.length > column.wipLimit;
          const open = panel?.id === column.id ? panel.mode : null;
          const colDrop = dragCol && colOver !== null && dragCol !== column.id;
          return (
            <section
              key={column.id}
              className={[
                "adm-col",
                over?.stage === column.id ? "drop" : "",
                column.done ? "is-done" : "",
                overLimit ? "over-wip" : "",
                dragCol === column.id ? "dragging" : "",
                colDrop && colOver === i ? "col-drop-before" : "",
                colDrop && colOver === i + 1 && i === columns.length - 1 ? "col-drop-after" : "",
              ].join(" ")}
              onDragOver={(e) => {
                if (dragCol) {
                  e.preventDefault();
                  setColOver(columnDropIndex(e, i));
                  return;
                }
                if (!dragging) return;
                e.preventDefault();
                setOver(dropIndex(e, column.id));
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragCol) {
                  const from = columns.findIndex((c) => c.id === dragCol);
                  const to = colOver ?? i;
                  placeColumn(dragCol, to > from ? to - 1 : to);
                  setDragCol(null);
                  setColOver(null);
                  return;
                }
                drop(column.id);
              }}
              aria-label={column.name}
            >
              <header
                draggable={can.manage && !open}
                className={can.manage ? "is-draggable" : ""}
                title={can.manage ? "Arraste para reordenar a coluna" : undefined}
                onDragStart={(e) => {
                  if (!can.manage) return;
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", `coluna:${column.id}`);
                  setDragCol(column.id);
                }}
                onDragEnd={() => {
                  setDragCol(null);
                  setColOver(null);
                }}
              >
                <span className="adm-col-num">{String(i + 1).padStart(2, "0")}</span>
                <strong>{column.name}</strong>
                {column.done && (
                  <span className="adm-col-done" title="Coluna de entrega: projetos aqui contam como concluídos">
                    ✓
                  </span>
                )}
                <span
                  className={`adm-col-count ${full ? "full" : ""} ${overLimit ? "over" : ""}`}
                  title={column.wipLimit !== null ? `Limite WIP: ${column.wipLimit} projeto(s) em andamento` : undefined}
                >
                  {items.length}
                  {column.wipLimit !== null && `/${column.wipLimit}`}
                </span>
                {can.manage && (
                  <Dropdown
                    label={`Opções da coluna ${column.name}`}
                    buttonClass="adm-icon-btn adm-col-menu"
                    button={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <circle cx="5" cy="12" r="1.8" />
                        <circle cx="12" cy="12" r="1.8" />
                        <circle cx="19" cy="12" r="1.8" />
                      </svg>
                    }
                  >
                    <MenuLabel>{column.name}</MenuLabel>
                    <MenuAction icon={icons.edit} onSelect={() => setPanel({ id: column.id, mode: "edit" })}>
                      Editar coluna e limite WIP
                    </MenuAction>
                    <MenuAction icon={icons.plus} onSelect={() => setPanel({ id: column.id, mode: "after" })}>
                      Adicionar coluna depois
                    </MenuAction>
                    {i > 0 && (
                      <MenuAction icon={icons.left} onSelect={() => placeColumn(column.id, i - 1)}>
                        Mover para a esquerda
                      </MenuAction>
                    )}
                    {i < columns.length - 1 && (
                      <MenuAction icon={icons.right} onSelect={() => placeColumn(column.id, i + 1)}>
                        Mover para a direita
                      </MenuAction>
                    )}
                    {can.remove && columns.length > 1 && (
                      <>
                        <MenuSeparator />
                        <MenuAction icon={icons.trash} danger onSelect={() => setPanel({ id: column.id, mode: "delete" })}>
                          Excluir coluna
                        </MenuAction>
                      </>
                    )}
                  </Dropdown>
                )}
              </header>
              {overLimit && <p className="adm-col-warn">Acima do limite WIP: termine antes de puxar mais projetos.</p>}

              {open === "edit" && (
                <ColumnEditor
                  column={column}
                  busy={pending}
                  onCancel={() => setPanel(null)}
                  onSave={(data) => {
                    setColumns((prev) => prev.map((c) => (c.id === column.id ? { ...c, ...data } : c)));
                    run(() => updateColumn(column.id, data), () => setPanel(null));
                  }}
                />
              )}
              {open === "after" && (
                <NewColumn
                  busy={pending}
                  onCancel={() => setPanel(null)}
                  onCreate={(name) => run(() => createColumn(name, column.id), () => setPanel(null))}
                />
              )}
              {open === "delete" && (
                <DeleteColumn
                  column={column}
                  count={items.length}
                  others={columns.filter((c) => c.id !== column.id)}
                  busy={pending}
                  onCancel={() => setPanel(null)}
                  onDelete={(moveTo) => run(() => deleteColumn(column.id, moveTo), () => setPanel(null))}
                />
              )}

              <div className="adm-col-body">
                {items.map((card, index) => (
                  <div key={card.id}>
                    {over?.stage === column.id && over.index === index && dragging !== card.id && <div className="adm-drop-line" />}
                    <article
                      data-card={card.id}
                      className={`adm-task ${dragging === card.id ? "dragging" : ""}`}
                      draggable={can.move}
                      onDragStart={(e) => {
                        e.stopPropagation();
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", card.id);
                        setDragging(card.id);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setOver(null);
                      }}
                    >
                      <Link href={`/admin/projetos?projeto=${card.id}`} scroll={false} className="adm-task-open">
                        <strong>{card.name}</strong>
                        {card.client && <small>{card.client}</small>}
                      </Link>
                      <div className="adm-task-meta">
                        {card.quote && <span className="adm-mono">📄 {card.quote}</span>}
                        {card.due && <span className={card.late ? "late" : ""}>{card.late ? "⚠ " : "📅 "}{card.due}</span>}
                        {card.tasksTotal > 0 && (
                          <span className={card.tasksDone === card.tasksTotal ? "done" : ""}>
                            ☑ {card.tasksDone}/{card.tasksTotal}
                          </span>
                        )}
                        {card.files > 0 && <span>📎 {card.files}</span>}
                      </div>
                      <div className="adm-task-foot">
                        <span className="adm-task-links">
                          {card.github && (
                            <a href={card.github} target="_blank" rel="noopener noreferrer" title="GitHub" draggable={false}>
                              GitHub
                            </a>
                          )}
                          {card.preview && (
                            <a href={card.preview} target="_blank" rel="noopener noreferrer" title="Preview" draggable={false}>
                              Preview
                            </a>
                          )}
                        </span>
                        {card.owner && (
                          <span title={card.owner.name}>
                            <Avatar name={card.owner.name} image={card.owner.image} size={24} />
                          </span>
                        )}
                      </div>
                    </article>
                  </div>
                ))}
                {over?.stage === column.id && over.index >= items.filter((c) => c.id !== dragging).length && (
                  <div className="adm-drop-line" />
                )}
                {items.length === 0 && !dragging && <p className="adm-col-empty">Arraste um projeto para cá</p>}
              </div>
            </section>
          );
        })}

        {can.manage && (
          <section className="adm-col adm-col-add" aria-label="Nova coluna">
            {adding ? (
              <NewColumn busy={pending} onCancel={() => setAdding(false)} onCreate={(name) => run(() => createColumn(name), () => setAdding(false))} />
            ) : (
              <button type="button" className="adm-col-add-btn" onClick={() => setAdding(true)}>
                + Nova coluna
              </button>
            )}
          </section>
        )}
      </div>
    </>
  );
}

/** Nome, limite WIP e "coluna de entrega". */
function ColumnEditor({
  column,
  busy,
  onSave,
  onCancel,
}: {
  column: Column;
  busy: boolean;
  onSave: (data: { name: string; wipLimit: number | null; done: boolean }) => void;
  onCancel: () => void;
}) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const wip = String(form.get("wipLimit") ?? "").trim();
    onSave({ name: String(form.get("name") ?? ""), wipLimit: wip ? Number(wip) : null, done: form.get("done") === "on" });
  }
  return (
    <form className="adm-col-form" onSubmit={submit}>
      <label className="adm-field">
        <span className="adm-label">Nome da coluna</span>
        <input name="name" defaultValue={column.name} maxLength={40} required autoFocus />
      </label>
      <label className="adm-field">
        <span className="adm-label">Limite WIP</span>
        <input name="wipLimit" type="number" min={1} max={99} inputMode="numeric" defaultValue={column.wipLimit ?? ""} placeholder="Sem limite" />
        <small className="adm-hint">Máximo de projetos ao mesmo tempo nesta coluna.</small>
      </label>
      <label className="adm-check">
        <input type="checkbox" name="done" defaultChecked={column.done} />
        Coluna de entrega (concluído)
      </label>
      <FormButtons busy={busy} onCancel={onCancel} label="Salvar" />
    </form>
  );
}

function NewColumn({ busy, onCreate, onCancel }: { busy: boolean; onCreate: (name: string) => void; onCancel: () => void }) {
  return (
    <form
      className="adm-col-form"
      onSubmit={(event) => {
        event.preventDefault();
        onCreate(String(new FormData(event.currentTarget).get("name") ?? ""));
      }}
    >
      <label className="adm-field">
        <span className="adm-label">Nome da nova coluna</span>
        <input name="name" maxLength={40} required autoFocus placeholder="Ex.: Revisão do cliente" />
      </label>
      <FormButtons busy={busy} onCancel={onCancel} label="Criar coluna" />
    </form>
  );
}

/** Exclusão: os projetos da coluna precisam de um novo lugar. */
function DeleteColumn({
  column,
  count,
  others,
  busy,
  onDelete,
  onCancel,
}: {
  column: Column;
  count: number;
  others: Column[];
  busy: boolean;
  onDelete: (moveTo: string) => void;
  onCancel: () => void;
}) {
  return (
    <form
      className="adm-col-form danger"
      onSubmit={(event) => {
        event.preventDefault();
        onDelete(String(new FormData(event.currentTarget).get("moveTo") ?? ""));
      }}
    >
      <p>
        Excluir <strong>{column.name}</strong>?{" "}
        {count > 0 ? `Os ${count} projeto(s) desta coluna vão para:` : "A coluna está vazia."}
      </p>
      <label className={`adm-field ${count > 0 ? "" : "sr-only"}`}>
        <span className="adm-label">Mover projetos para</span>
        <select name="moveTo" defaultValue={others[0]?.id}>
          {others.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <FormButtons busy={busy} onCancel={onCancel} label="Excluir coluna" danger />
    </form>
  );
}

function FormButtons({ busy, onCancel, label, danger }: { busy: boolean; onCancel: () => void; label: string; danger?: boolean }) {
  return (
    <div className="adm-col-form-actions">
      <button type="button" className="adm-btn ghost small" onClick={onCancel}>
        Cancelar
      </button>
      <button type="submit" className={`adm-btn small ${danger ? "danger" : ""}`} disabled={busy}>
        {busy ? "Salvando…" : label}
      </button>
    </div>
  );
}
