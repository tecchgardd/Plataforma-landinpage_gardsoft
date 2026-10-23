"use client";

import { useState, useTransition } from "react";
import { resetContent, saveContent } from "../../_actions/content";
import { uploadImage } from "../../_actions/media";
import type { FieldSpec, SectionSpec } from "./specs";

type Obj = Record<string, unknown>;

function ImageInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function upload(file: File | undefined) {
    if (!file) return;
    setError("");
    const data = new FormData();
    data.set("file", file);
    startTransition(async () => {
      const result = await uploadImage(data);
      if (result.error) setError(result.error);
      else if (result.url) onChange(result.url);
    });
  }

  return (
    <div className="adm-image">
      {value ? (
        <img src={value} alt="" />
      ) : (
        <div className="adm-image-empty">Sem imagem</div>
      )}
      <div className="adm-image-actions">
        <label className="adm-btn ghost small">
          {pending ? "Enviando..." : value ? "Trocar imagem" : "Enviar imagem"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => upload(e.target.files?.[0])} disabled={pending} />
        </label>
        {value && (
          <button type="button" className="adm-btn ghost small" onClick={() => onChange("")}>
            Remover
          </button>
        )}
        {error && <span className="adm-msg error">{error}</span>}
      </div>
    </div>
  );
}

function ListEditor({ spec, value, onChange }: { spec: Extract<FieldSpec, { type: "list" }>; value: Obj[]; onChange: (v: Obj[]) => void }) {
  const [open, setOpen] = useState<number | null>(value.length ? 0 : null);

  function update(index: number, item: Obj) {
    onChange(value.map((v, i) => (i === index ? item : v)));
  }
  function move(index: number, dir: -1 | 1) {
    const target = index + dir;
    if (target < 0 || target >= value.length) return;
    const next = [...value];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setOpen(target);
  }
  function remove(index: number) {
    const title = String(value[index][spec.titleKey] ?? spec.itemLabel);
    if (!window.confirm(`Remover "${title}"?`)) return;
    onChange(value.filter((_, i) => i !== index));
    setOpen(null);
  }
  function add() {
    onChange([...value, structuredClone(spec.empty)]);
    setOpen(value.length);
  }

  return (
    <div className="adm-list-editor">
      {value.map((item, i) => (
        <div key={i} className={`adm-item ${open === i ? "open" : ""}`}>
          <div className="adm-item-head">
            <button type="button" className="adm-item-title" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
              <span className="adm-item-num">{i + 1}</span>
              <strong>{String(item[spec.titleKey] || `Sem título`)}</strong>
              {"published" in item && !item.published && <span className="adm-badge">Rascunho</span>}
            </button>
            <div className="adm-item-tools">
              <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover para cima">
                ↑
              </button>
              <button type="button" onClick={() => move(i, 1)} disabled={i === value.length - 1} aria-label="Mover para baixo">
                ↓
              </button>
              <button type="button" onClick={() => remove(i)} aria-label="Remover" className="danger">
                ×
              </button>
            </div>
          </div>
          {open === i && (
            <div className="adm-item-body">
              <Fields fields={spec.item} value={item} onChange={(v) => update(i, v)} />
            </div>
          )}
        </div>
      ))}
      <button type="button" className="adm-btn ghost" onClick={add}>
        + Adicionar {spec.itemLabel}
      </button>
    </div>
  );
}

function Fields({ fields, value, onChange }: { fields: FieldSpec[]; value: Obj; onChange: (v: Obj) => void }) {
  const set = (key: string, v: unknown) => onChange({ ...value, [key]: v });
  return (
    <div className="adm-form-grid">
      {fields.map((field) => {
        const current = value[field.key];
        const wide = field.type === "textarea" || field.type === "list" || field.type === "image";
        if (field.type === "checkbox")
          return (
            <label key={field.key} className="adm-check wide">
              <input type="checkbox" checked={Boolean(current)} onChange={(e) => set(field.key, e.target.checked)} /> {field.label}
            </label>
          );
        return (
          <div key={field.key} className={`adm-field ${wide ? "wide" : ""}`}>
            <span className="adm-label">{field.label}</span>
            {field.type === "text" && <input value={String(current ?? "")} onChange={(e) => set(field.key, e.target.value)} />}
            {field.type === "textarea" && (
              <textarea rows={4} value={String(current ?? "")} onChange={(e) => set(field.key, e.target.value)} />
            )}
            {field.type === "tags" && (
              <TagsInput value={(current as string[]) ?? []} onChange={(v) => set(field.key, v)} />
            )}
            {field.type === "select" && (
              <select value={String(current ?? "")} onChange={(e) => set(field.key, e.target.value)}>
                {field.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            )}
            {field.type === "image" && <ImageInput value={String(current ?? "")} onChange={(v) => set(field.key, v)} />}
            {field.type === "list" && <ListEditor spec={field} value={(current as Obj[]) ?? []} onChange={(v) => set(field.key, v)} />}
            {field.hint && <small className="adm-hint">{field.hint}</small>}
          </div>
        );
      })}
    </div>
  );
}

function parseTags(text: string) {
  return text
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Campo de etiquetas: mantém o texto enquanto digita e converte para lista. */
function TagsInput({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join(", "));
  const [prev, setPrev] = useState(value);
  // Se a lista mudou por fora (ex.: item reordenado), reflete no texto.
  if (prev !== value) {
    setPrev(value);
    if (parseTags(text).join("|") !== value.join("|")) setText(value.join(", "));
  }
  return (
    <input
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseTags(e.target.value));
      }}
    />
  );
}

export default function ContentEditor({ section, initial, customized }: { section: SectionSpec; initial: unknown; customized: boolean }) {
  const [value, setValue] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function change(v: unknown) {
    setValue(v);
    setDirty(true);
    setMessage(null);
  }

  function save() {
    startTransition(async () => {
      const result = await saveContent(section.key, JSON.stringify(value));
      setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: result.success ?? "Salvo." });
      if (!result.error) setDirty(false);
    });
  }

  function reset() {
    if (!window.confirm("Descartar as edições desta seção e voltar ao texto padrão?")) return;
    startTransition(async () => {
      const result = await resetContent(section.key);
      setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: result.success ?? "" });
      if (!result.error) window.location.reload();
    });
  }

  return (
    <div className="adm-editor">
      <div className="adm-card">
        <Fields fields={section.fields} value={value as Obj} onChange={change} />
      </div>
      <div className="adm-savebar">
        <span className={message ? (message.ok ? "adm-msg ok" : "adm-msg error") : "adm-msg"}>
          {message?.text ?? (dirty ? "Alterações não salvas" : "")}
        </span>
        {customized && (
          <button type="button" className="adm-btn ghost" onClick={reset} disabled={pending}>
            Restaurar padrão
          </button>
        )}
        <a href={`/${section.anchor ? `#${section.anchor}` : ""}`} target="_blank" rel="noopener noreferrer" className="adm-btn ghost">
          Ver no site ↗
        </a>
        <button type="button" className="adm-btn" onClick={save} disabled={pending || !dirty}>
          {pending ? "Salvando..." : "Salvar e publicar"}
        </button>
      </div>
    </div>
  );
}
