"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useId, useLayoutEffect, useRef, useState, useTransition, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Só um menu aberto por vez: abrir outro fecha o anterior. */
let closeOpen: (() => void) | null = null;

const CloseContext = createContext<() => void>(() => {});

type Props = {
  /** Conteúdo do botão que abre o menu. */
  button: ReactNode;
  buttonClass?: string;
  /** Nome acessível do botão (ex.: "Ações de Fernando"). */
  label: string;
  /** Alinhamento do menu em relação ao botão. */
  align?: "start" | "end";
  disabled?: boolean;
  children: ReactNode;
};

/**
 * Menu suspenso das tabelas: sempre abre para baixo do botão, por cima de tudo (fica no
 * .adm-root, fora da área com rolagem da tabela, então não é cortado). Fecha com Esc, clique
 * fora, rolagem da página ou ao escolher um item.
 */
export default function Dropdown({ button, buttonClass = "adm-icon-btn", label, align = "end", disabled, children }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left?: number; right?: number; maxHeight: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const id = useId();

  const close = useCallback(() => setOpen(false), []);

  function toggle() {
    if (open) return close();
    closeOpen?.();
    closeOpen = close;
    setOpen(true);
  }

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    // No celular a barra de abas fixa cobre o rodapé da tela: o menu não pode ir para baixo dela.
    const tabbar = document.querySelector(".adm-tabbar")?.getBoundingClientRect();
    const floor = tabbar && tabbar.height > 0 ? tabbar.top : window.innerHeight;
    const below = floor - rect.bottom - 18;
    const above = rect.top - 18;
    const height = menuRef.current?.scrollHeight ?? 0;
    // Abre para cima quando não cabe embaixo (ex.: última linha da tabela) e há mais espaço em cima.
    const up = height > below && above > below;
    setPos({
      ...(up ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
      maxHeight: Math.max(120, up ? above : below),
      ...(align === "end" ? { right: Math.max(8, window.innerWidth - rect.right) } : { left: Math.max(8, rect.left) }),
    });
  }, [open, align]);

  useEffect(() => {
    if (!open) {
      if (closeOpen === close) closeOpen = null;
      return;
    }
    menuRef.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!menuRef.current?.contains(target) && !buttonRef.current?.contains(target)) close();
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
        buttonRef.current?.focus();
      }
    };
    // Rolar a página (fora do menu) tiraria o menu de baixo do botão: fecha.
    const onScroll = (e: Event) => {
      if (!menuRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [open, close]);

  // Setas do teclado percorrem os itens.
  function onMenuKey(e: KeyboardEvent) {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>("[role=menuitem]:not([aria-disabled=true])") ?? [])];
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === "ArrowDown" ? (at + 1) % items.length : (at - 1 + items.length) % items.length;
    items[next]?.focus();
  }

  const host = typeof document === "undefined" ? null : document.querySelector(".adm-root");

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={`${buttonClass} ${open ? "is-open" : ""}`}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        disabled={disabled}
        onClick={toggle}
      >
        {button}
      </button>
      {open &&
        host &&
        createPortal(
          <div
            ref={menuRef}
            id={id}
            role="menu"
            aria-label={label}
            className={`adm-dropdown ${pos?.bottom !== undefined ? "up" : ""}`}
            style={pos ? { top: pos.top, bottom: pos.bottom, left: pos.left, right: pos.right, maxHeight: pos.maxHeight } : { visibility: "hidden" }}
            onKeyDown={onMenuKey}
          >
            <CloseContext.Provider value={close}>{children}</CloseContext.Provider>
          </div>,
          host,
        )}
    </>
  );
}

const icon = (d: string) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

/** Ícones dos itens de menu (traço simples, mesmo estilo dos outros do portal). */
export const menuIcons = {
  open: icon("M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"),
  doc: icon("M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4"),
  plus: icon("M12 5v14M5 12h14"),
  whatsapp: icon("M4 20l1.3-3.9A8 8 0 1 1 8 19zM9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 1c-1.2-.5-2.5-1.8-3-3l1-1-1-2z"),
  mail: icon("M4 6h16v12H4zM4 7l8 6 8-6"),
  recover: icon("M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5"),
  check: icon("M5 12l5 5L20 7"),
  copy: icon("M9 9h10v10H9zM5 15V5h10"),
  download: icon("M12 4v11M7 10l5 5 5-5M5 20h14"),
  contract: icon("M7 3h10v18H7zM10 8h4M10 12h4M10 16h2"),
  folder: icon("M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"),
  cancel: icon("M6 6l12 12M18 6 6 18"),
  trash: icon("M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"),
};

type ItemProps = { icon?: ReactNode; children: ReactNode; danger?: boolean };

/** Item que navega dentro do portal (abre o registro na janela central quando há rota em @modal). */
export function MenuLink({ href, icon, children, danger }: ItemProps & { href: string }) {
  const close = useContext(CloseContext);
  return (
    <Link href={href} role="menuitem" tabIndex={-1} className={`adm-dropdown-item ${danger ? "danger" : ""}`} onClick={close} scroll={false}>
      {icon}
      <span>{children}</span>
    </Link>
  );
}

/** Item que abre fora do portal (WhatsApp, e-mail, PDF). */
export function MenuAnchor({ href, icon, children, download }: ItemProps & { href: string; download?: boolean }) {
  const close = useContext(CloseContext);
  const external = !href.startsWith("/") || href.startsWith("/api/");
  return (
    <a
      href={href}
      role="menuitem"
      tabIndex={-1}
      className="adm-dropdown-item"
      onClick={close}
      {...(download ? { download: true } : external && !href.startsWith("mailto:") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {icon}
      <span>{children}</span>
    </a>
  );
}

/** Item que executa uma ação (server action ou função local), com confirmação opcional. */
export function MenuAction({ onSelect, confirm, icon, children, danger }: ItemProps & { onSelect: () => unknown; confirm?: string }) {
  const close = useContext(CloseContext);
  const [, startTransition] = useTransition();
  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      className={`adm-dropdown-item ${danger ? "danger" : ""}`}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        close();
        startTransition(async () => {
          await onSelect();
        });
      }}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}

export function MenuSeparator() {
  return <hr className="adm-dropdown-sep" role="separator" />;
}

/** Título de um grupo de itens dentro do menu. */
export function MenuLabel({ children }: { children: ReactNode }) {
  return <p className="adm-dropdown-label">{children}</p>;
}

/** Botão "⋯" padrão das linhas das tabelas. */
export function RowMenu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <Dropdown
      label={label}
      buttonClass="adm-icon-btn adm-row-menu"
      button={
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      }
    >
      {children}
    </Dropdown>
  );
}
