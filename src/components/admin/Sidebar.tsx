"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/brand/Logo";
import Avatar from "./Avatar";
import { authClient } from "@/lib/auth-client";

const links = [
  { href: "/admin", label: "Dashboard", icon: "M4 13h6V4H4zM14 20h6V4h-6zM4 20h6v-4H4z" },
  { href: "/admin/leads", label: "Leads", icon: "M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19 8v6M22 11h-6" },
  { href: "/admin/clientes", label: "Clientes", icon: "M3 21V7l9-4 9 4v14M9 21v-6h6v6M8 10h.01M12 10h.01M16 10h.01" },
  { href: "/admin/projetos", label: "Projetos", icon: "M3 7h18v13H3zM8 7V4h8v3M3 12h18" },
  { href: "/admin/campanhas", label: "Campanhas", icon: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" },
  { href: "/admin/conteudo", label: "Conteúdo do site", icon: "M4 4h16v16H4zM4 9h16M9 9v11" },
  { href: "/admin/usuarios", label: "Usuários", icon: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21a7 7 0 0 1 14 0M17 11a3 3 0 1 0 0-6M22 21a6 6 0 0 0-5-6" },
  { href: "/admin/historico", label: "Histórico", icon: "M12 8v4l3 2M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" },
];

export default function Sidebar({ name, email, image }: { name: string; email: string; image: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

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
        <button type="button" className="adm-menu" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu">
          {open ? "×" : "☰"}
        </button>
      </div>
      <aside className={`adm-sidebar ${open ? "open" : ""}`}>
        <Link href="/admin" className="adm-brand" onClick={() => setOpen(false)}>
          <Logo size={28} />
          <span className="adm-brand-tag">Portal</span>
        </Link>
        <nav>
          {links.map((link) => {
            const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={active ? "active" : ""}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={link.icon} />
                </svg>
                {link.label}
              </Link>
            );
          })}
        </nav>
        <Link
          href="/admin/perfil"
          className={`adm-user ${pathname.startsWith("/admin/perfil") ? "active" : ""}`}
          onClick={() => setOpen(false)}
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
