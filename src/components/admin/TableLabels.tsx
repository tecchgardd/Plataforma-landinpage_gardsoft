"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

/** Copia o título de cada coluna para `data-label` nas células de toda `.adm-table`. */
function label(root: ParentNode) {
  root.querySelectorAll<HTMLTableElement>("table.adm-table").forEach((table) => {
    const heads = [...table.querySelectorAll("thead th")].map((th) => th.textContent?.trim() ?? "");
    table.querySelectorAll("tbody tr").forEach((row) => {
      // Linha com link do registro: a linha inteira abre o registro (ver o clique em TableLabels).
      row.classList.toggle("is-clickable", Boolean(row.querySelector("a.adm-row-link")));
      let col = 0;
      for (const cell of row.children as HTMLCollectionOf<HTMLTableCellElement>) {
        const text = heads[col] ?? "";
        if (cell.dataset.label !== text) cell.dataset.label = text;
        col += cell.colSpan || 1;
      }
    });
  });
}

/**
 * No celular as tabelas do portal viram uma lista de cards (CSS em admin.css), e cada
 * célula mostra o nome da coluna como rótulo. Linhas novas (filtros, ações) são rotuladas
 * automaticamente.
 */
/** Elementos que têm ação própria dentro da linha: o clique neles não abre o registro. */
const INTERACTIVE = "a, button, select, input, textarea, label, summary, [role=button], [role=menu]";

export default function TableLabels() {
  const pathname = usePathname();
  const router = useRouter();

  // Clique em qualquer parte da linha abre o registro (Ctrl/Cmd ou botão do meio abre em outra aba).
  useEffect(() => {
    const main = document.querySelector(".adm-main");
    if (!main) return;
    const onClick = (event: Event) => {
      const e = event as MouseEvent;
      const target = e.target as HTMLElement;
      const row = target.closest<HTMLTableRowElement>("table.adm-table tbody tr");
      if (!row || target.closest(INTERACTIVE) || window.getSelection()?.toString()) return;
      const href = row.querySelector<HTMLAnchorElement>("a.adm-row-link")?.getAttribute("href");
      if (!href) return;
      if (e.ctrlKey || e.metaKey || e.button === 1) window.open(href, "_blank");
      else router.push(href);
    };
    main.addEventListener("click", onClick);
    main.addEventListener("auxclick", onClick);
    return () => {
      main.removeEventListener("click", onClick);
      main.removeEventListener("auxclick", onClick);
    };
  }, [router]);

  useEffect(() => {
    const main = document.querySelector(".adm-main");
    if (!main) return;
    label(main);
    const observer = new MutationObserver(() => label(main));
    observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);
  return null;
}
