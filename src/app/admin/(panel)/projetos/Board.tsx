"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, type DragEvent } from "react";
import Avatar from "@/components/admin/Avatar";
import { moveProjectTo } from "../../_actions/projects";

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

type Column = { value: string; label: string };

/** Quadro estilo Trello: arraste os cards entre as etapas ou para reordenar. */
export default function Board({ columns, cards: initial }: { columns: readonly Column[]; cards: Card[] }) {
  const router = useRouter();
  const [cards, setCards] = useState(initial);
  const [dragging, setDragging] = useState<string | null>(null);
  const [over, setOver] = useState<{ stage: string; index: number } | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => setCards(initial), [initial]);

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

  return (
    <div className="adm-board">
      {columns.map((column, i) => {
        const items = cards.filter((c) => c.stage === column.value);
        return (
          <section
            key={column.value}
            className={`adm-col ${over?.stage === column.value ? "drop" : ""}`}
            onDragOver={(e) => {
              if (!dragging) return;
              e.preventDefault();
              setOver(dropIndex(e, column.value));
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              drop(column.value);
            }}
            aria-label={column.label}
          >
            <header>
              <span className="adm-col-num">{String(i + 1).padStart(2, "0")}</span>
              <strong>{column.label}</strong>
              <span className="adm-col-count">{items.length}</span>
            </header>
            <div className="adm-col-body">
              {items.map((card, index) => (
                <div key={card.id}>
                  {over?.stage === column.value && over.index === index && dragging !== card.id && <div className="adm-drop-line" />}
                  <article
                    data-card={card.id}
                    className={`adm-task ${dragging === card.id ? "dragging" : ""}`}
                    draggable
                    onDragStart={(e) => {
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
              {over?.stage === column.value && over.index >= items.filter((c) => c.id !== dragging).length && (
                <div className="adm-drop-line" />
              )}
              {items.length === 0 && !dragging && <p className="adm-col-empty">Arraste um projeto para cá</p>}
            </div>
          </section>
        );
      })}
    </div>
  );
}
