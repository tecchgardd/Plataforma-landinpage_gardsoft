"use client";

import { useOptimistic, useTransition } from "react";
import { recoverLead, setLeadStatus } from "../../_actions/leads";
import { leadStatuses } from "@/lib/admin/options";

/** Status editável direto na lista. */
export function StatusSelect({ id, value, name }: { id: string; value: string; name: string }) {
  const [current, setCurrent] = useOptimistic(value);
  const [pending, startTransition] = useTransition();
  return (
    <select
      className={`adm-status-select status-${current}`}
      value={current}
      disabled={pending}
      aria-label={`Status de ${name}`}
      onChange={(e) => {
        const next = e.target.value;
        startTransition(async () => {
          setCurrent(next);
          await setLeadStatus(id, next);
        });
      }}
    >
      {leadStatuses.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

/** Repescagem: devolve um lead sem interesse para a fila de contato. */
export function RecoverButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="adm-row-btn"
      disabled={pending}
      title="Volta para Aguardando contato"
      onClick={() => startTransition(() => recoverLead(id))}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
      </svg>
      {pending ? "Repescando…" : "Repescar"}
    </button>
  );
}
