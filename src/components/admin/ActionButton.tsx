"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/lib/admin/form";

/** Botão que executa uma server action e mostra o resultado logo abaixo. */
export default function ActionButton({
  action,
  children,
  className = "adm-btn",
  pendingText = "Aguarde...",
  confirm,
}: {
  action: (state: FormState) => Promise<FormState>;
  children: ReactNode;
  className?: string;
  pendingText?: string;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className="adm-action-button"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <button type="submit" className={className} disabled={pending}>
        {pending ? pendingText : children}
      </button>
      {(state.error || state.success) && (
        <p role="status" className={`adm-msg ${state.error ? "error" : "ok"}`}>
          {state.error ?? state.success}
        </p>
      )}
    </form>
  );
}
