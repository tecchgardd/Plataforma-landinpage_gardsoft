"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Avatar from "./Avatar";
import { Icon, activeHref, leaves, links, type NavItem } from "./Sidebar";
import { authClient } from "@/lib/auth-client";

/** Mesmo ícone do menu lateral, para a navegação ser reconhecível nos dois tamanhos de tela. */
const iconOf = (href: string) => leaves(links).find((l) => l.href === href)?.icon ?? "";

const icons = {
  home: "M3 11 12 3l9 8M5 9.5V21h5v-6h4v6h5V9.5",
  leads: iconOf("/admin/leads"),
  create: "M4 4h16v16H4zM12 8v8M8 12h8",
  clients: iconOf("/admin/clientes"),
};

const tabs = [
  { href: "/admin", label: "Dashboard", icon: icons.home },
  { href: "/admin/leads", label: "Leads", icon: icons.leads },
  { href: "/admin/clientes", label: "Clientes", icon: icons.clients },
];

const createActions: { href: string; label: string; icon: string }[] = [
  { href: "/admin/leads/novo", label: "Lead", icon: icons.leads },
  { href: "/admin/clientes/novo", label: "Cliente", icon: icons.clients },
  { href: "/admin/projetos/novo", label: "Projeto", icon: iconOf("/admin/projetos") },
  { href: "/admin/orcamentos/novo", label: "Orçamento", icon: iconOf("/admin/orcamentos") },
  { href: "/admin/contratos/novo", label: "Contrato", icon: iconOf("/admin/contratos") },
  { href: "/admin/financeiro/lancamento/novo", label: "Lançamento", icon: "M3 7h18v12H3zM3 11h18M7 15h3" },
  { href: "/admin/notas-fiscais/nova", label: "Nota fiscal", icon: iconOf("/admin/notas-fiscais") },
  { href: "/admin/campanhas/novo", label: "Campanha", icon: iconOf("/admin/campanhas") },
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

export default function MobileNav({ name, email, image }: { name: string; email: string; image: string | null }) {
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
  const inMenu = !tabs.some((t) => t.href === active);

  return (
    <>
      <nav className="adm-tabbar" aria-label="Navegação principal">
        {tabs.slice(0, 2).map((tab) => (
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
          className={sheet === "create" ? "active" : ""}
          aria-label="Criar novo"
          aria-haspopup="dialog"
          title="Criar novo"
          onClick={() => setSheet("create")}
        >
          <Icon d={icons.create} size={26} />
        </button>
        {tabs.slice(2).map((tab) => (
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
          {createActions.map((action) => (
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
        {sections(links).map((section) => (
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
