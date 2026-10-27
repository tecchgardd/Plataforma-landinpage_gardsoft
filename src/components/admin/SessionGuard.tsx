"use client";

import { useEffect } from "react";
import { endSession } from "@/app/admin/_actions/auth";
import { TAB_SESSION_CHANNEL, hasTabSession, markTabSession } from "@/lib/tab-session";

/**
 * Encerra a sessão quando o portal é reaberto depois de fechar a aba ou o navegador.
 * A aba que fez login guarda uma marca no sessionStorage (some ao fechar). Uma aba sem a marca
 * pergunta às outras abas do portal se alguma continua aberta; sem resposta, revoga a sessão
 * no servidor e volta para o login. Enquanto decide, a página fica escondida (script no layout).
 */
export default function SessionGuard() {
  useEffect(() => {
    const channel = "BroadcastChannel" in window ? new BroadcastChannel(TAB_SESSION_CHANNEL) : null;
    let decided = hasTabSession();
    let timer: number | undefined;

    const keep = () => {
      decided = true;
      window.clearTimeout(timer);
      markTabSession();
      document.documentElement.style.removeProperty("visibility");
    };

    if (channel)
      channel.onmessage = (event) => {
        if (event.data === "ping" && hasTabSession()) channel.postMessage("pong");
        else if (event.data === "pong" && !decided) keep();
      };

    if (!decided) {
      channel?.postMessage("ping");
      timer = window.setTimeout(async () => {
        if (decided) return;
        decided = true;
        await endSession().catch(() => {});
        window.location.replace("/admin/login?fechou=1");
      }, 400);
    }

    return () => {
      window.clearTimeout(timer);
      channel?.close();
    };
  }, []);
  return null;
}
