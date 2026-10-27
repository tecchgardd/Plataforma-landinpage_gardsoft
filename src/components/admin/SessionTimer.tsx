"use client";

import { useEffect } from "react";

/**
 * Leva para o login quando a sessão expira (prazo fixo de 4h), mesmo com o portal aberto e parado.
 * Navegação completa (não pelo router) para descartar o estado da página; a aba em segundo plano
 * pode atrasar o timer, por isso a hora é conferida de novo quando a aba volta a ficar visível.
 */
export default function SessionTimer({ expiresAt }: { expiresAt: string }) {
  useEffect(() => {
    // Pequena folga para o servidor também já considerar a sessão vencida (senão o login devolveria ao portal).
    const end = new Date(expiresAt).getTime() + 2000;
    const expire = () => window.location.assign("/admin/login?expirou=1");
    const check = () => {
      if (Date.now() >= end) expire();
    };
    const timer = window.setTimeout(expire, Math.max(0, end - Date.now()));
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [expiresAt]);
  return null;
}
