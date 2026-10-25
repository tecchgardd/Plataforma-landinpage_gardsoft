"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Avatar from "./Avatar";
import { Icon, activeHref, leaves, links, visibleLinks, type Levels, type NavItem } from "./Sidebar";
import type { ModuleKey } from "@/lib/permissions";
import { authClient } from "@/lib/auth-client";

/** Mesmo ícone do menu lateral, para a navegação ser reconhecível nos dois tamanhos de tela. */
const iconOf = (href: string) => leaves(links).find((l) => l.href === href)?.icon ?? "";

const icons = {
  home: "M3 11 12 3l9 8M5 9.5V21h5v-6h4v6h5V9.5",
  leads: iconOf("/admin/leads"),
  create: "M4 4h16v16H4zM12 8v8M8 12h8",
  clients: iconOf("/admin/clientes"),
};

const tabs: { href: string; label: string; icon: string; module: ModuleKey }[] = [
  { href: "/admin", label: "Dashboard", icon: icons.home, module: "dashboard" },
  { href: "/admin/leads", label: "Leads", icon: icons.leads, module: "leads" },
  { href: "/admin/clientes", label: "Clientes", icon: icons.clients, module: "clientes" },
];

const money = "M3 7h18v12H3zM3 11h18M7 15h3";
const createActions: { href: string; label: string; icon: string; module: ModuleKey }[] = [
  { href: "/admin/leads/novo", label: "Lead", icon: icons.leads, module: "leads" },
  { href: "/admin/clientes/novo", label: "Cliente", icon: icons.clients, module: "clientes" },
  { href: "/admin/projetos/novo", label: "Projeto", icon: iconOf("/admin/projetos"), module: "projetos" },
  { href: "/admin/orcamentos/novo", label: "Orçamento", icon: iconOf("/admin/orcamentos"), module: "orcamentos" },
  { href: "/admin/contratos/novo", label: "Contrato", icon: iconOf("/admin/contratos"), module: "contratos" },
  { href: "/admin/documentos/novo", label: "Documento", icon: iconOf("/admin/documentos"), module: "documentos" },
  { href: "/admin/financeiro/cobrancas/nova", label: "Cobrança", icon: money, module: "financeiro" },
  { href: "/admin/financeiro/despesas/nova", label: "Despesa", icon: money, module: "financeiro" },
  { href: "/admin/notas-fiscais/nova", label: "Nota fiscal", icon: "M4 4h16v16H4zM8 8h8M8 12h8M8 16h5", module: "notas" },
  { href: "/admin/campanhas/novo", label: "Campanha", icon: iconOf("/admin/campanhas"), module: "campanhas" },
];

/** Seções do menu completo: itens soltos em "Geral" e cada grupo do menu lateral como uma seção. */
function sections(items: NavItem[]) {
  const result: { title: string; items: NavItem[] }[] = [];
  // A seção do grupo é criada antes dos subgrupos, para manter a ordem do menu lateral.
  const walk = (list: NavItem[], title: string, parentIcon?: string) => {
    const section = { title, items: [] as NavItem[] };
    result.push(section);
    for (const item of list) {
      if (item.children) walk(item.children, item.label, item.icon);
      else if (item.soon) continue;
      else section.items.push({ ...item, icon: item.icon ?? parentIcon });
    }
  };
  walk(items, "Geral");
  return result.filter((s) => s.items.length);
}

/** Painel que sobe da parte de baixo da tela (dialog nativo: Esc fecha e o foco fica preso dentro). */
function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      className="adm-sheet"
      aria-label={title}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="adm-sheet-body">
        <span className="adm-sheet-grabber" aria-hidden="true" />
        {children}
      </div>
    </dialog>
  );
}

export default function MobileNav({ name, email, image, levels }: { name: string; email: string; image: string | null; levels: Levels }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sheet, setSheet] = useState<"create" | "menu" | null>(null);
  const active = activeHref(pathname);

  // Fecha o painel ao trocar de página.
  useEffect(() => setSheet(null), [pathname]);

  async function logout() {
    await authClient.signOut();
    router.replace("/admin/login");
    router.refresh();
  }

  const close = () => setSheet(null);
  const myTabs = tabs.filter((t) => levels[t.module] > 0);
  const myActions = createActions.filter((a) => levels[a.module] >= 2);
  const inMenu = !myTabs.some((t) => t.href === active);

  return (
    <>
      <nav className="adm-tabbar" aria-label="Navegação principal">
        {myTabs.slice(0, 2).map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={active === tab.href ? "active" : ""}
            aria-current={active === tab.href ? "page" : undefined}
            aria-label={tab.label}
            title={tab.label}
          >
            <Icon d={tab.icon} size={26} />
          </Link>
        ))}
        {myActions.length > 0 && (
        <button
          type="button"
          className={sheet === "create" ? "active" : ""}
          aria-label="Criar novo"
          aria-haspopup="dialog"
          title="Criar novo"
          onClick={() => setSheet("create")}
        >
          <Icon d={icons.create} size={26} />
        </button>
        )}
        {myTabs.slice(2).map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={active === tab.href ? "active" : ""}
            aria-current={active === tab.href ? "page" : undefined}
            aria-label={tab.label}
            title={tab.label}
          >
            <Icon d={tab.icon} size={26} />
          </Link>
        ))}
        <button
          type="button"
          className={`adm-tabbar-me ${inMenu || sheet === "menu" ? "active" : ""}`}
          aria-label="Menu e perfil"
          aria-haspopup="dialog"
          title="Menu e perfil"
          onClick={() => setSheet("menu")}
        >
          <Avatar name={name} image={image} size={28} />
        </button>
      </nav>

      <Sheet open={sheet === "create"} onClose={close} title="Criar novo">
        <h2 className="adm-sheet-title">Criar novo</h2>
        <div className="adm-sheet-grid">
          {myActions.map((action) => (
            <Link key={action.href} href={action.href} className="adm-sheet-tile" onClick={close}>
              <span>
                <Icon d={action.icon} size={22} />
              </span>
              {action.label}
            </Link>
          ))}
        </div>
      </Sheet>

      <Sheet open={sheet === "menu"} onClose={close} title="Menu">
        <Link href="/admin/perfil" className="adm-sheet-profile" onClick={close}>
          <Avatar name={name} image={image} size={48} />
          <span>
            <strong>{name}</strong>
            <small>{email}</small>
          </span>
          <em>Ver perfil →</em>
        </Link>
        {sections(visibleLinks(links, levels)).map((section) => (
          <section key={section.title} className="adm-sheet-section">
            <h3>{section.title}</h3>
            <div className="adm-sheet-list">
              {section.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={active === item.href ? "active" : ""}
                  aria-current={active === item.href ? "page" : undefined}
                  onClick={close}
                >
                  {item.icon && <Icon d={item.icon} size={20} />}
                  {item.label}
                </Link>
              ))}
            </div>
          </section>
        ))}
        <section className="adm-sheet-section">
          <h3>Em breve</h3>
          <div className="adm-sheet-list">
            {links
              .filter((item) => item.soon)
              .map((item) => (
                <div key={item.href} className="adm-sheet-soon">
                  {item.icon && <Icon d={item.icon} size={20} />}
                  <span>
                    <strong>
                      {item.label} <span className="adm-soon-tag">Em breve</span>
                    </strong>
                    <small>{item.soon}</small>
                  </span>
                </div>
              ))}
          </div>
        </section>
        <div className="adm-sheet-actions">
          <a href="/" target="_blank" rel="noopener noreferrer">
            Ver site ↗
          </a>
          <button type="button" onClick={logout}>
            Sair
          </button>
        </div>
      </Sheet>
    </>
  );
}
