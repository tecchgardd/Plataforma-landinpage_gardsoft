"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/** Moldura do modal do projeto: fecha com Esc, clique fora ou botão, e trava a rolagem do fundo. */
export default function ModalShell({ children, title }: { children: ReactNode; title: string }) {
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = () => router.push("/admin/projetos", { scroll: false });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) close();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [router]);

  return (
    <div
      className="adm-modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) router.push("/admin/projetos", { scroll: false });
      }}
    >
      <div ref={ref} className="adm-modal" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <button
          type="button"
          className="adm-modal-close"
          aria-label="Fechar"
          onClick={() => router.push("/admin/projetos", { scroll: false })}
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
}
