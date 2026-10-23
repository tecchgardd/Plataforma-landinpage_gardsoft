"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import type { FormState } from "@/lib/admin/form";

export function SubmitButton({ children, className = "adm-btn", pendingText = "Salvando..." }: {
  children: ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}

/** Formulário ligado a uma server action com retorno de erro/sucesso. */
export default function ActionForm({
  action,
  children,
  submitLabel = "Salvar",
  className = "adm-form",
  footer,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  footer?: ReactNode;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (state.error || state.success) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [state]);

  return (
    <form action={formAction} className={className}>
      <div className="adm-form-grid">{children}</div>
      <div className="adm-form-footer">
        <SubmitButton>{submitLabel}</SubmitButton>
        {footer}
        <p ref={ref} role="status" className={state.error ? "adm-msg error" : state.success ? "adm-msg ok" : "adm-msg"}>
          {state.error ?? state.success}
        </p>
      </div>
    </form>
  );
}

/** Botão que executa uma ação destrutiva após confirmação. */
export function ConfirmButton({
  action,
  children,
  confirm,
  className = "adm-btn danger",
}: {
  action: () => Promise<void>;
  children: ReactNode;
  confirm: string;
  className?: string;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirm)) event.preventDefault();
      }}
    >
      <SubmitButton className={className} pendingText="Aguarde...">
        {children}
      </SubmitButton>
    </form>
  );
}
