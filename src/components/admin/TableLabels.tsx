"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Copia o título de cada coluna para `data-label` nas células de toda `.adm-table`. */
function label(root: ParentNode) {
  root.querySelectorAll<HTMLTableElement>("table.adm-table").forEach((table) => {
    const heads = [...table.querySelectorAll("thead th")].map((th) => th.textContent?.trim() ?? "");
    table.querySelectorAll("tbody tr").forEach((row) => {
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
export default function TableLabels() {
  const pathname = usePathname();
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
