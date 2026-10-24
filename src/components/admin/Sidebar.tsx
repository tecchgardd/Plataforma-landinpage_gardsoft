"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "@/components/brand/Logo";
import Avatar from "./Avatar";
import { authClient } from "@/lib/auth-client";

export type NavItem = { href: string; label: string; icon?: string; children?: NavItem[] };

export const links: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: "M4 13h6V4H4zM14 20h6V4h-6zM4 20h6v-4H4z" },
  { href: "/admin/leads", label: "Leads", icon: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 8v6M22 11h-6" },
  { href: "/admin/clientes", label: "Clientes", icon: "M3 21V7l9-4 9 4v14M9 21v-6h6v6M8 10h.01M12 10h.01M16 10h.01" },
  { href: "/admin/projetos", label: "Projetos", icon: "M3 7h18v13H3zM8 7V4h8v3M3 12h18" },
  {
    href: "#comercial",
    label: "Comercial",
    icon: "M3 8h18v12H3zM8 8V5h8v3M3 13h18",
    children: [
      { href: "/admin/orcamentos", label: "Orçamentos", icon: "M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6M9 16h3" },
      { href: "/admin/contratos", label: "Contratos", icon: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h4" },
      {
        href: "#financeiro",
        label: "Financeiro",
        icon: "M3 7h18v12H3zM3 11h18M7 15h3M16 3v4M8 3v4",
        children: [
          { href: "/admin/financeiro", label: "Visão geral" },
          { href: "/admin/financeiro/cobrancas", label: "Cobranças" },
          { href: "/admin/financeiro/recebimentos", label: "Recebimentos" },
          { href: "/admin/financeiro/pagar", label: "Contas a pagar" },
          { href: "/admin/financeiro/despesas", label: "Despesas" },
        ],
      },
      { href: "/admin/notas-fiscais", label: "Notas fiscais", icon: "M4 4h16v16H4zM8 8h8M8 12h8M8 16h5" },
      { href: "/admin/empresa", label: "Perfil da empresa", icon: "M4 21V5l8-3 8 3v16M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4" },
      { href: "/admin/contratos/configuracao", label: "Configuração CT", icon: "M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1M15 4v4M9 10v4M17 16v4" },
    ],
  },
  { href: "/admin/campanhas", label: "Campanhas", icon: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" },
  { href: "/admin/conteudo", label: "Conteúdo do site", icon: "M4 4h16v16H4zM4 9h16M9 9v11" },
  { href: "/admin/usuarios", label: "Usuários", icon: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-5-6" },
  { href: "/admin/historico", label: "Histórico", icon: "M12 8v4l3 2M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" },
];

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

function NavList({ items, active, onNavigate, depth = 0 }: { items: NavItem[]; active: string | null; onNavigate: () => void; depth?: number }) {
  return (
    <>
      {items.map((item) =>
        item.children ? (
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

export default function Sidebar({ name, email, image }: { name: string; email: string; image: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const active = activeHref(pathname);

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
          <NavList items={links} active={active} onNavigate={() => {}} />
        </nav>
        <Link
          href="/admin/perfil"
          className={`adm-user ${pathname.startsWith("/admin/perfil") ? "active" : ""}`}
         
          title="Abrir meu perfil"
        >
          <Avatar name={name} image={image} size={36} />
          <span className="adm-user-info">
            <strong>{name}</strong>
            <small>{email}</small>
          </span>
        </Link>
        <div className="adm-side-actions">
          <a href="/" target="_blank" rel="noopener noreferrer">
            Ver site ↗
          </a>
          <button type="button" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>
    </>
  );
}
