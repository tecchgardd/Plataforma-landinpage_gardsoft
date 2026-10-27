"use client";

import { useActionState } from "react";
import { signIn } from "@/app/admin/_actions/auth";
import { markTabSession } from "@/lib/tab-session";

/** O formulário só envia os dados: a validação da senha e a criação da sessão acontecem no servidor. */
export default function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {});

  return (
    // A marca da aba vai antes do envio: o login redireciona para o portal, que confere a marca (SessionGuard).
    <form className="login-form" action={action} onSubmit={markTabSession}>
      <div className="login-textbox">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6" />
        </svg>
        <input id="login" name="login" defaultValue={state.login} required autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus />
        <label htmlFor="login">Usuário ou e-mail</label>
      </div>
      <div className="login-textbox">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <rect x="5" y="10" width="14" height="11" rx="2.5" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3M12 14.5v2.5" />
        </svg>
        <input id="password" name="password" type="password" required autoComplete="current-password" />
        <label htmlFor="password">Senha</label>
      </div>
      <button type="submit" className="login-submit" disabled={pending}>
        <p>{pending ? "Entrando..." : "Entrar"}</p>
        <span aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </button>
      {state.error && (
        <p role="alert" className="login-error">
          {state.error}
        </p>
      )}
    </form>
  );
}
