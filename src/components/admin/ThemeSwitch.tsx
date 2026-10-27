"use client";

import { useEffect, useState } from "react";
import { THEME_COOKIE } from "@/lib/theme";

type Theme = "light" | "dark";

const root = () => document.querySelector<HTMLElement>(".adm-root");

/** Chave "Modo escuro": troca o tema na hora e guarda a escolha num cookie (lido pelo layout do portal). */
/** `menuItem`: dentro de um menu (setas do teclado navegam até ela). */
export default function ThemeSwitch({ className = "", menuItem = false }: { className?: string; menuItem?: boolean }) {
  const [theme, setTheme] = useState<Theme>("light");

  // O tema inicial já vem renderizado pelo servidor no .adm-root.
  useEffect(() => {
    setTheme(root()?.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const el = root();
    if (el) el.dataset.theme = next;
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }

  return (
    <button type="button" role={menuItem ? "menuitemcheckbox" : "switch"} aria-checked={theme === "dark"} className={`adm-theme-switch ${className}`} onClick={toggle}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 13a9 9 0 1 1-10-10 7 7 0 0 0 10 10z" />
      </svg>
      <span>Modo escuro</span>
      <span className="adm-switch" aria-hidden="true" />
    </button>
  );
}
