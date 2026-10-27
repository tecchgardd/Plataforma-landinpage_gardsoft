"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import Logo from "@/components/brand/Logo";
import Avatar from "./Avatar";
import ThemeSwitch from "./ThemeSwitch";
import { authClient } from "@/lib/auth-client";
import type { Level, ModuleKey } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon?: string;
  /** Módulo exigido para ver o item (sem módulo = todos veem). */
  module?: ModuleKey;
  /** Recurso ainda não lançado: aparece com a etiqueta "Em breve" e um balão explicando. */
  soon?: string;
  children?: NavItem[];
};

export type Levels = Record<ModuleKey, Level>;

export const links: NavItem[] = [
  { href: "/admin", label: "Dashboard", module: "dashboard", icon: "M4 13h6V4H4zM14 20h6V4h-6zM4 20h6v-4H4z" },
  { href: "/admin/leads", label: "Leads", module: "leads", icon: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 8v6M22 11h-6" },
  { href: "/admin/clientes", label: "Clientes", module: "clientes", icon: "M3 21V7l9-4 9 4v14M9 21v-6h6v6M8 10h.01M12 10h.01M16 10h.01" },
  { href: "/admin/projetos", label: "Projetos", module: "projetos", icon: "M3 7h18v13H3zM8 7V4h8v3M3 12h18" },
  {
    href: "#comercial",
    label: "Comercial",
    icon: "M3 8h18v12H3zM8 8V5h8v3M3 13h18",
    children: [
      { href: "/admin/orcamentos", label: "Orçamentos", module: "orcamentos", icon: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3" },
      { href: "/admin/contratos", label: "Contratos", module: "contratos", icon: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h4" },
      { href: "/admin/documentos", label: "Documentos", module: "documentos", icon: "M8 3h8l4 4v14H8zM16 3v4h4M4 7v14h4M11 12h6M11 16h4" },
      { href: "/admin/contratos/configuracao", label: "Configuração CT", module: "empresa", icon: "M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4" },
      { href: "/admin/empresa", label: "Perfil da empresa", module: "empresa", icon: "M4 21V5l8-3 8 3v16M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4" },
    ],
  },
  {
    href: "#financeiro",
    label: "Financeiro",
    icon: "M3 7h18v12H3zM3 11h18M7 15h3M16 3v4M8 3v4",
    children: [
      { href: "/admin/financeiro", label: "Visão geral", module: "financeiro" },
      { href: "/admin/financeiro/cobrancas", label: "Cobranças", module: "financeiro" },
      { href: "/admin/financeiro/recebimentos", label: "Recebimentos", module: "financeiro" },
      { href: "/admin/financeiro/pagar", label: "Contas a pagar", module: "financeiro" },
      { href: "/admin/financeiro/despesas", label: "Despesas", module: "financeiro" },
      { href: "/admin/notas-fiscais", label: "Notas fiscais", module: "notas" },
    ],
  },
  { href: "/admin/campanhas", label: "Campanhas", module: "campanhas", icon: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" },
  { href: "/admin/bi", label: "BI e metas", module: "bi", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
  {
    href: "#assistente",
    label: "Assistente IA",
    icon: "M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
    soon: "Um agente de IA que trabalha por você dentro do portal: consulta dados, cadastra clientes, monta orçamentos e contratos e executa tarefas por comando de texto.",
  },
  {
    href: "#automacao",
    label: "Automação",
    icon: "M13 2 4 14h7l-1 8 9-12h-7z",
    soon: "Alertas e fluxos automáticos: avisos no celular quando entrar lead ou uma conta for vencer, envio para grupos e integrações com outras ferramentas.",
  },
  {
    href: "#administracao",
    label: "Administração",
    icon: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4",
    children: [
      { href: "/admin/usuarios", label: "Usuários", module: "usuarios" },
      { href: "/admin/perfis", label: "Perfis de acesso", module: "perfis" },
      { href: "/admin/conteudo", label: "Conteúdo do site", module: "conteudo" },
    ],
  },
  { href: "/admin/historico", label: "Histórico", module: "historico", icon: "M12 8v4l3 2M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" },
];

/** Tira do menu o que o perfil não pode ver (grupos vazios somem junto). */
export function visibleLinks(items: NavItem[], levels: Levels): NavItem[] {
  return items.flatMap((item) => {
    if (item.children) {
      const children = visibleLinks(item.children, levels);
      return children.length ? [{ ...item, children }] : [];
    }
    return !item.module || levels[item.module] > 0 ? [item] : [];
  });
}

export const leaves = (items: NavItem[]): NavItem[] => items.flatMap((i) => (i.children ? leaves(i.children) : [i]));

/** Link ativo: o de caminho mais longo que contém a página atual (ex.: /admin/contratos/configuracao → Configuração CT). */
export function activeHref(pathname: string) {
  const match = leaves(links)
    .filter((l) => (l.href === "/admin" ? pathname === "/admin" : pathname === l.href || pathname.startsWith(`${l.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.href ?? null;
}

const contains = (item: NavItem, href: string | null): boolean => item.href === href || Boolean(item.children?.some((c) => contains(c, href)));

export function Icon({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

type Flyout = { open: string | null; setOpen: (href: string | null) => void };

function NavList({
  items,
  active,
  onNavigate,
  depth = 0,
  flyout,
}: {
  items: NavItem[];
  active: string | null;
  onNavigate: () => void;
  depth?: number;
  flyout?: Flyout;
}) {
  return (
    <>
      {items.map((item) =>
        item.soon ? (
          <SoonItem key={item.href} item={item} />
        ) : item.children && flyout && depth === 0 ? (
          <NavFlyout key={item.href} item={item} active={active} flyout={flyout} />
        ) : item.children ? (
          <NavGroup key={item.href} item={item} active={active} onNavigate={onNavigate} depth={depth} />
        ) : (
          <Link
            key={item.href}
            href={item.href}
            className={active === item.href ? "active" : ""}
            aria-current={active === item.href ? "page" : undefined}
            onClick={onNavigate}
          >
            {item.icon ? <Icon d={item.icon} /> : <span className="adm-nav-dot" aria-hidden="true" />}
            {item.label}
          </Link>
        ),
      )}
    </>
  );
}

/**
 * Recurso que ainda vai ser lançado. Ao passar o mouse (ou focar pelo teclado) abre um balão à direita.
 * O balão usa posição fixa porque o menu tem rolagem e cortaria um balão posicionado dentro dele.
 */
function SoonItem({ item }: { item: NavItem }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; below: boolean } | null>(null);
  const id = `soon-${item.href.slice(1)}`;
  const show = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    // No celular/tablet não há espaço à direita: o balão abre logo abaixo.
    const right = rect.right + 12 + 300 <= window.innerWidth;
    setPos(right ? { top: rect.top + rect.height / 2, left: rect.right + 12, below: false } : { top: rect.bottom + 8, left: rect.left, below: true });
  };
  return (
    <div
      ref={ref}
      className="adm-nav-soon"
      tabIndex={0}
      role="note"
      aria-describedby={pos ? id : undefined}
      onMouseEnter={show}
      onMouseLeave={() => setPos(null)}
      onFocus={show}
      onBlur={() => setPos(null)}
    >
      {item.icon && <Icon d={item.icon} />}
      <span>{item.label}</span>
      <span className="adm-soon-tag">Em breve</span>
      {pos && (
        <div id={id} role="tooltip" className={`adm-soon-pop ${pos.below ? "below" : ""}`} style={{ top: pos.top, left: pos.left }}>
          <strong>
            {item.label} <span className="adm-soon-tag">Em breve</span>
          </strong>
          <p>{item.soon}</p>
          <small>Em breve estará disponível na plataforma.</small>
        </div>
      )}
    </div>
  );
}

/** Grupo que abre e fecha; começa aberto quando a página atual está dentro dele. */
function NavGroup({ item, active, onNavigate, depth }: { item: NavItem; active: string | null; onNavigate: () => void; depth: number }) {
  const inside = contains(item, active);
  const [open, setOpen] = useState(inside);
  // Ao navegar para uma página do grupo, ele abre (e continua podendo ser fechado).
  useEffect(() => {
    if (inside) setOpen(true);
  }, [inside]);
  const id = `nav-${item.href.slice(1)}`;
  return (
    <div className={`adm-nav-group depth-${depth} ${inside ? "has-active" : ""}`}>
      <button type="button" className="adm-nav-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}>
        {item.icon && <Icon d={item.icon} />}
        {item.label}
        <span className="adm-nav-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <div id={id} className="adm-nav-children">
          <NavList items={item.children!} active={active} onNavigate={onNavigate} depth={depth + 1} />
        </div>
      )}
    </div>
  );
}

type PanelPos = { top: number; left: number; arrow: number };

/**
 * Painel flutuante à direita da barra lateral (grupos do menu e menu da conta).
 * Posição fixa, como o balão do "Em breve", para não ser cortado pela rolagem do menu.
 * Fecha com clique fora, Esc/←, saída do foco, rolagem do menu ou redimensionamento.
 */
function useSidePanel(open: boolean, onClose: () => void) {
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const items = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>("[role^=menuitem]") ?? []);
  const close = (refocus = false) => {
    onClose();
    if (refocus) toggleRef.current?.focus();
  };

  // Abre ao lado da barra, alinhado ao botão; se não couber embaixo, sobe até caber na tela.
  useLayoutEffect(() => {
    if (!open) return setPos(null);
    const row = toggleRef.current?.getBoundingClientRect();
    const bar = toggleRef.current?.closest(".adm-sidebar")?.getBoundingClientRect();
    if (!row || !bar) return;
    const height = panelRef.current?.offsetHeight ?? 0;
    const top = Math.max(12, Math.min(row.top - 10, window.innerHeight - height - 12));
    setPos({ top, left: bar.right + 10, arrow: row.top + row.height / 2 - top });
  }, [open]);

  // Foco no primeiro item só depois de posicionado (antes disso o painel está invisível e não recebe foco).
  useEffect(() => {
    if (pos) items()[0]?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pos]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !toggleRef.current?.contains(target)) onClose();
    };
    const nav = toggleRef.current?.closest(".adm-sidebar")?.querySelector("nav");
    document.addEventListener("pointerdown", onPointer);
    nav?.addEventListener("scroll", onClose);
    window.addEventListener("resize", onClose);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      nav?.removeEventListener("scroll", onClose);
      window.removeEventListener("resize", onClose);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const panelProps = {
    ref: panelRef,
    className: "adm-flyout",
    style: pos ? { top: pos.top, left: pos.left, ["--arrow-y" as string]: `${pos.arrow}px` } : { visibility: "hidden" as const },
    onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      const list = items();
      const index = list.indexOf(document.activeElement as HTMLElement);
      const move = (to: number) => {
        event.preventDefault();
        list[(to + list.length) % list.length]?.focus();
      };
      if (event.key === "Escape" || event.key === "ArrowLeft") {
        event.preventDefault();
        close(true);
      } else if (event.key === "ArrowDown") move(index + 1);
      else if (event.key === "ArrowUp") move(index - 1);
      else if (event.key === "Home") move(0);
      else if (event.key === "End") move(list.length - 1);
    },
    onBlur: (event: FocusEvent<HTMLDivElement>) => {
      const next = event.relatedTarget as Node | null;
      if (!panelRef.current?.contains(next) && !toggleRef.current?.contains(next)) onClose();
    },
  };

  return { toggleRef, panelProps, close };
}

/** Grupo do menu lateral (Comercial, Financeiro…): em vez de expandir para baixo, abre um painel à direita da barra. */
function NavFlyout({ item, active, flyout }: { item: NavItem; active: string | null; flyout: Flyout }) {
  const open = flyout.open === item.href;
  const { toggleRef, panelProps, close } = useSidePanel(open, () => flyout.setOpen(null));
  const inside = contains(item, active);
  const id = `flyout-${item.href.slice(1)}`;

  return (
    <div className={`adm-nav-group adm-flyout-group ${inside ? "has-active" : ""} ${open ? "is-open" : ""}`}>
      <button
        ref={toggleRef}
        type="button"
        className="adm-nav-toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => flyout.setOpen(open ? null : item.href)}
        onKeyDown={(event) => {
          if (event.key === "ArrowRight" && !open) {
            event.preventDefault();
            flyout.setOpen(item.href);
          }
        }}
      >
        {item.icon && <Icon d={item.icon} />}
        <span className="adm-nav-toggle-label">{item.label}</span>
        <span className="adm-nav-caret" aria-hidden="true">
          <Icon d="m9 6 6 6-6 6" size={14} />
        </span>
      </button>
      {open && (
        <div {...panelProps} id={id} role="menu" aria-label={item.label}>
          <p className="adm-flyout-title">
            {item.icon && <Icon d={item.icon} size={16} />}
            {item.label}
          </p>
          {item.children!.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              role="menuitem"
              className={`adm-flyout-row ${active === child.href ? "active" : ""}`}
              aria-current={active === child.href ? "page" : undefined}
              onClick={() => close()}
            >
              {child.icon ? <Icon d={child.icon} /> : <span className="adm-nav-dot" aria-hidden="true" />}
              <span>{child.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Conta no rodapé da barra: uma linha (avatar, nome, perfil de acesso) que abre o menu com perfil, tema, site e sair. */
function AccountMenu({
  name,
  email,
  image,
  role,
  open,
  setOpen,
  onLogout,
}: {
  name: string;
  email: string;
  image: string | null;
  role?: string | null;
  open: boolean;
  setOpen: (open: boolean) => void;
  onLogout: () => void;
}) {
  const { toggleRef, panelProps, close } = useSidePanel(open, () => setOpen(false));
  return (
    <div className={`adm-account ${open ? "is-open" : ""}`}>
      <button
        ref={toggleRef}
        type="button"
        className="adm-account-toggle"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="adm-account-menu"
        onClick={() => setOpen(!open)}
      >
        <Avatar name={name} image={image} size={38} />
        <span className="adm-account-info">
          <strong>{name}</strong>
          <small>{role ?? email}</small>
        </span>
        <span className="adm-account-more" aria-hidden="true">
          <Icon d="M12 6h.01M12 12h.01M12 18h.01" size={18} />
        </span>
      </button>
      {open && (
        <div {...panelProps} id="adm-account-menu" role="menu" aria-label="Sua conta">
          <div className="adm-account-card">
            <Avatar name={name} image={image} size={40} />
            <span className="adm-account-info">
              <strong>{name}</strong>
              <small>{email}</small>
            </span>
          </div>
          <Link href="/admin/perfil" role="menuitem" className="adm-flyout-row" onClick={() => close()}>
            <Icon d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0" />
            <span>Meu perfil</span>
          </Link>
          <ThemeSwitch className="adm-flyout-row" menuItem />
          <a href="/" target="_blank" rel="noopener noreferrer" role="menuitem" className="adm-flyout-row" onClick={() => close()}>
            <Icon d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />
            <span>Ver site</span>
          </a>
          <hr className="adm-flyout-sep" />
          <button type="button" role="menuitem" className="adm-flyout-row danger" onClick={onLogout}>
            <Icon d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9" />
            <span>Sair</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  name,
  email,
  image,
  role,
  levels,
}: {
  name: string;
  email: string;
  image: string | null;
  /** Nome do perfil de acesso (ex.: Super admin). */
  role?: string | null;
  levels: Levels;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const active = activeHref(pathname);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);

  // Trocar de página fecha os painéis.
  useEffect(() => {
    setOpenGroup(null);
    setAccountOpen(false);
  }, [pathname]);

  async function logout() {
    await authClient.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <>
      <div className="adm-topbar">
        <Link href="/admin" aria-label="Dashboard">
          <Logo size={24} />
        </Link>
        <span className="adm-brand-tag">Portal</span>
      </div>
      <aside className="adm-sidebar">
        <Link href="/admin" className="adm-brand">
          <Logo size={28} />
          <span className="adm-brand-tag">Portal</span>
        </Link>
        <nav>
          <NavList items={visibleLinks(links, levels)} active={active} onNavigate={() => {}} flyout={{ open: openGroup, setOpen: setOpenGroup }} />
        </nav>
        <AccountMenu name={name} email={email} image={image} role={role} open={accountOpen} setOpen={setAccountOpen} onLogout={logout} />
      </aside>
    </>
  );
}
