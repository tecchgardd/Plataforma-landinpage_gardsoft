"use client";

import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import type { FormState } from "@/lib/admin/form";
import { addNote, addTask, deleteNote, deleteTask, toggleTask } from "../../_actions/projects";

type Task = { id: string; title: string; done: boolean };

/** Checklist do projeto com adição, marcação e exclusão. */
export function Checklist({ projectId, tasks }: { projectId: string; tasks: Task[] }) {
  const [items, update] = useOptimistic(tasks, (state: Task[], change: { id: string; done?: boolean; remove?: boolean }) =>
    change.remove ? state.filter((t) => t.id !== change.id) : state.map((t) => (t.id === change.id ? { ...t, done: change.done ?? t.done } : t)),
  );
  const [title, setTitle] = useState("");
  const [pending, startTransition] = useTransition();
  const done = items.filter((t) => t.done).length;

  return (
    <div className="adm-checklist">
      {items.length > 0 && (
        <div className="adm-progress" aria-label={`${done} de ${items.length} concluídas`}>
          <span style={{ width: `${(done / items.length) * 100}%` }} />
          <small>
            {done}/{items.length}
          </small>
        </div>
      )}
      <ul>
        {items.map((t) => (
          <li key={t.id} className={t.done ? "done" : ""}>
            <label>
              <input
                type="checkbox"
                checked={t.done}
                onChange={(e) => {
                  const checked = e.target.checked;
                  startTransition(async () => {
                    update({ id: t.id, done: checked });
                    await toggleTask(t.id, checked);
                  });
                }}
              />
              <span>{t.title}</span>
            </label>
            <button
              type="button"
              aria-label={`Remover ${t.title}`}
              onClick={() =>
                startTransition(async () => {
                  update({ id: t.id, remove: true });
                  await deleteTask(t.id);
                })
              }
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <form
        className="adm-inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          const value = title.trim();
          if (!value) return;
          setTitle("");
          startTransition(() => addTask(projectId, value));
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nova tarefa (ex.: Configurar domínio)" maxLength={200} />
        <button type="submit" className="adm-btn small" disabled={pending || !title.trim()}>
          Adicionar
        </button>
      </form>
    </div>
  );
}

type Note = { id: string; text: string; author: string | null; kind: string; createdAt: string };

/** Atualizações do projeto (registro das ações) + histórico automático. */
export function Updates({ projectId, notes }: { projectId: string; notes: Note[] }) {
  const [state, action, pending] = useActionState(addNote.bind(null, projectId) as (s: FormState, f: FormData) => Promise<FormState>, {});
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <div className="adm-updates">
      <form ref={formRef} action={action} className="adm-note-form">
        <textarea name="text" rows={3} placeholder="O que foi feito? Ex.: Cliente aprovou o layout da home, ajustar cores do rodapé." maxLength={4000} />
        <div>
          <button type="submit" className="adm-btn small" disabled={pending}>
            {pending ? "Salvando..." : "Registrar atualização"}
          </button>
          {state.error && <span className="adm-msg error">{state.error}</span>}
        </div>
      </form>
      <ol className="adm-timeline">
        {notes.map((n) => (
          <li key={n.id} className={n.kind === "sistema" ? "system" : ""}>
            <div className="adm-timeline-head">
              <strong>{n.author ?? "Sistema"}</strong>
              <time>{new Date(n.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
              {n.kind === "nota" && (
                <button
                  type="button"
                  aria-label="Excluir atualização"
                  onClick={() => {
                    if (window.confirm("Excluir esta atualização?")) startTransition(() => deleteNote(n.id));
                  }}
                >
                  ×
                </button>
              )}
            </div>
            <p>{n.text}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
