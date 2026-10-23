"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

export default function PasswordForm() {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const newPassword = String(data.get("new"));
    if (newPassword.length < 8) return setMessage({ ok: false, text: "A nova senha precisa de pelo menos 8 caracteres." });
    if (newPassword !== data.get("confirm")) return setMessage({ ok: false, text: "As senhas não conferem." });
    setPending(true);
    const { error } = await authClient.changePassword({
      currentPassword: String(data.get("current")),
      newPassword,
      revokeOtherSessions: true,
    });
    setPending(false);
    if (error) return setMessage({ ok: false, text: "Senha atual incorreta." });
    form.reset();
    setMessage({ ok: true, text: "Senha alterada com sucesso." });
  }

  return (
    <form className="adm-form" onSubmit={onSubmit}>
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
        <p role="status" className={message ? (message.ok ? "adm-msg ok" : "adm-msg error") : "adm-msg"}>
          {message?.text}
        </p>
      </div>
    </form>
  );
}
