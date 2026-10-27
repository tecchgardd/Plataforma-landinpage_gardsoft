"use client";

import { useEffect, useState } from "react";
import { HIDE_MONEY_COOKIE } from "@/lib/theme";

const root = () => document.querySelector<HTMLElement>(".adm-root");

/**
 * Borra os valores em R$ (elementos com .adm-money) para mostrar a tela sem expor números,
 * ex.: em reunião ou compartilhando a tela. A escolha fica num cookie, lido pelo layout do portal.
 */
export default function MoneyToggle() {
  const [hidden, setHidden] = useState(false);

  // O estado inicial já vem renderizado pelo servidor no .adm-root.
  useEffect(() => {
    setHidden(root()?.dataset.hideMoney === "1");
  }, []);

  function toggle() {
    const next = !hidden;
    setHidden(next);
    const el = root();
    if (el) {
      if (next) el.dataset.hideMoney = "1";
      else delete el.dataset.hideMoney;
    }
    document.cookie = `${HIDE_MONEY_COOKIE}=${next ? "1" : "0"}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }

  return (
    <button type="button" className="adm-btn ghost adm-money-toggle" aria-pressed={hidden} onClick={toggle} title={hidden ? "Mostrar valores em R$" : "Borrar valores em R$"}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {hidden ? (
          <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 9 4.5 10 7a12.6 12.6 0 0 1-3.2 4.3M6.1 6.1C3.9 7.6 2.5 9.8 2 12c1 2.5 5 7 10 7a9.6 9.6 0 0 0 5.9-2.1" />
        ) : (
          <path d="M2 12c1-2.5 5-7 10-7s9 4.5 10 7c-1 2.5-5 7-10 7S3 14.5 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" />
        )}
      </svg>
      {hidden ? "Mostrar valores" : "Ocultar valores"}
    </button>
  );
}
