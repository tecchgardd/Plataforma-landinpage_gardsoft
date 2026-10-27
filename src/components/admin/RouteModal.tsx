"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

type Size = "default" | "wide";

/**
 * Janela no centro da tela para as páginas "Novo …" abertas pela lista (rota interceptada em @modal).
 * Fechar volta para a página de onde veio; abrir o link direto (ou recarregar) mostra a página inteira.
 *
 * Numa navegação pelo app o Next mantém o conteúdo do slot @modal mesmo quando a URL muda
 * (ex.: depois de salvar, que redireciona para o registro criado). Por isso a janela só aparece
 * enquanto a URL for a mesma em que ela abriu.
 */
export default function RouteModal({ children, size = "default" }: { children: ReactNode; size?: Size }) {
  const pathname = usePathname();
  const [openedAt] = useState(pathname);
  if (pathname !== openedAt) return null;
  return <ModalWindow size={size}>{children}</ModalWindow>;
}

/** <dialog> nativo: fica acima de tudo, prende o foco dentro e fecha com Esc. */
function ModalWindow({ children, size }: { children: ReactNode; size: Size }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const close = () => router.back();

  return (
    <dialog
      ref={ref}
      className={`adm-route-modal ${size === "wide" ? "wide" : ""}`}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onMouseDown={(event) => {
        // Clique no fundo escurecido (fora da janela) fecha.
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="adm-route-modal-body">
        <button type="button" className="adm-route-modal-close" aria-label="Fechar" onClick={close}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        {children}
      </div>
    </dialog>
  );
}
