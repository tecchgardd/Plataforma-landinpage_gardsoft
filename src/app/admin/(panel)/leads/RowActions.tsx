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
      className="adm-btn ghost small"
      disabled={pending}
      title="Volta para Aguardando contato"
      onClick={() => startTransition(() => recoverLead(id))}
    >
      {pending ? "..." : "↺ Repescar"}
    </button>
  );
}
