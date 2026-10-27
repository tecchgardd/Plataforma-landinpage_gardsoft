"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    const login = String(data.get("login")).trim();
    const password = String(data.get("password"));
    const rememberMe = data.get("remember") === "on";
    // Aceita o nome de usuário (ex.: admin) ou o e-mail.
    const { error } = login.includes("@")
      ? await authClient.signIn.email({ email: login, password, rememberMe })
      : await authClient.signIn.username({ username: login, password, rememberMe });
    if (error) {
      setPending(false);
      setError(
        error.status === 429
          ? "Muitas tentativas. Aguarde um minuto e tente de novo."
          : "Usuário ou senha incorretos.",
      );
      return;
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <form className="login-form" onSubmit={onSubmit}>
      <div className="login-textbox">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.2-4 4.3-6 8-6s6.8 2 8 6" />
        </svg>
        <input id="login" name="login" required autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus />
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
      <label className="login-remember">
        <input type="checkbox" name="remember" defaultChecked /> Manter conectado
      </label>
      <button type="submit" className="login-submit" disabled={pending}>
        <p>{pending ? "Entrando..." : "Entrar"}</p>
        <span aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </button>
      {error && (
        <p role="alert" className="login-error">
          {error}
        </p>
      )}
    </form>
  );
}
