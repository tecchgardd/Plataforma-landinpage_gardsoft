"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/admin/_actions/auth";

/** A troca de senha é validada no servidor; as outras sessões abertas são encerradas. */
export default function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, {});

  return (
    <form className="adm-form" action={action}>
      <div className="adm-form-grid">
        <label className="adm-field wide">
          <span className="adm-label">Senha atual</span>
          <input name="current" type="password" required autoComplete="current-password" />
        </label>
        <label className="adm-field">
          <span className="adm-label">Nova senha</span>
          <input name="new" type="password" required minLength={8} autoComplete="new-password" />
        </label>
        <label className="adm-field">
          <span className="adm-label">Confirme a nova senha</span>
          <input name="confirm" type="password" required minLength={8} autoComplete="new-password" />
        </label>
      </div>
      <div className="adm-form-footer">
        <button type="submit" className="adm-btn" disabled={pending}>
          {pending ? "Salvando..." : "Trocar senha"}
        </button>
        <p role="status" className={state.success ? "adm-msg ok" : state.error ? "adm-msg error" : "adm-msg"}>
          {state.success ?? state.error}
        </p>
      </div>
    </form>
  );
}
