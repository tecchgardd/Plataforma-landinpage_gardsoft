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
    <form className="adm-form auth-form" onSubmit={onSubmit}>
      <label className="adm-field wide">
        <span className="adm-label">Usuário ou e-mail</span>
        <input name="login" required autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus />
      </label>
      <label className="adm-field wide">
        <span className="adm-label">Senha</span>
        <input name="password" type="password" required autoComplete="current-password" />
      </label>
      <label className="adm-check wide">
        <input type="checkbox" name="remember" defaultChecked /> Manter conectado
      </label>
      <button type="submit" className="adm-btn wide" disabled={pending}>
        {pending ? "Entrando..." : "Entrar no portal"}
      </button>
      {error && (
        <p role="alert" className="adm-msg error wide">
          {error}
        </p>
      )}
    </form>
  );
}
