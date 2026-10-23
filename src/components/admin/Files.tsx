"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import type { FormState } from "@/lib/admin/form";

type FileRow = { id: string; name: string; label: string | null; size: number; mime: string; createdAt: string };

function sizeLabel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function kind(mime: string) {
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("image/")) return "IMG";
  if (mime.includes("xml")) return "XML";
  if (mime.includes("sheet") || mime === "text/csv") return "PLAN";
  if (mime.includes("word") || mime.includes("text")) return "DOC";
  return "ARQ";
}

/** Lista de anexos com envio e exclusão. */
export default function Files({
  files,
  type,
  upload,
  remove,
  suggestions = [],
}: {
  files: FileRow[];
  type: "cliente" | "projeto" | "financeiro" | "notafiscal";
  upload: (state: FormState, formData: FormData) => Promise<FormState>;
  remove: (id: string) => Promise<void>;
  suggestions?: string[];
}) {
  const [state, action, pending] = useActionState(upload, {});
  const [removing, startRemove] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state]);

  return (
    <div className="adm-files">
      {files.length === 0 ? (
        <p className="adm-files-empty">Nenhum arquivo anexado.</p>
      ) : (
        <ul>
          {files.map((f) => (
            <li key={f.id}>
              <span className="adm-file-kind">{kind(f.mime)}</span>
              <a href={`/api/arquivos/${type}/${f.id}`} target="_blank" rel="noopener noreferrer" className="adm-file-name">
                <strong>{f.label ?? f.name}</strong>
                <small>
                  {f.label ? `${f.name} · ` : ""}
                  {sizeLabel(f.size)} · {new Date(f.createdAt).toLocaleDateString("pt-BR")}
                </small>
              </a>
              <a href={`/api/arquivos/${type}/${f.id}?baixar`} className="adm-icon-btn" aria-label={`Baixar ${f.name}`}>
                ↓
              </a>
              <button
                type="button"
                className="adm-icon-btn danger"
                aria-label={`Excluir ${f.name}`}
                disabled={removing}
                onClick={() => {
                  if (window.confirm(`Excluir o arquivo "${f.label ?? f.name}"?`)) startRemove(() => remove(f.id));
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <form ref={formRef} action={action} className="adm-file-form">
        <input name="label" placeholder="Descrição (ex.: Inscrição estadual)" list={`sugestoes-${type}`} maxLength={80} />
        <datalist id={`sugestoes-${type}`}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
        <input
          name="file"
          type="file"
          required
          accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.xml,.csv,.txt,.docx,.xlsx,.pptx,.odt,.ods,.zip"
        />
        <button type="submit" className="adm-btn small" disabled={pending}>
          {pending ? "Enviando..." : "Anexar"}
        </button>
        {(state.error || state.success) && (
          <p className={`adm-msg ${state.error ? "error" : "ok"}`} role="status">
            {state.error ?? state.success}
          </p>
        )}
      </form>
      <small className="adm-hint">PDF, imagens, XML, planilhas, documentos ou ZIP · até 10 MB.</small>
    </div>
  );
}
