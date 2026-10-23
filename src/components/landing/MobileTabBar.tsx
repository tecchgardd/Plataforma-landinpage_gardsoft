"use client";

import { useEffect, useState } from "react";
import Icon, { type IconName } from "@/components/ui/Icon";
import { useContact } from "@/components/contact/ContactProvider";

type Tab = { id: string; label: string; icon: IconName };

const left: Tab[] = [
  { id: "inicio", label: "Início", icon: "home" },
  { id: "servicos", label: "Serviços", icon: "system" },
];
const right: Tab[] = [
  { id: "cases", label: "Cases", icon: "briefcase" },
  { id: "historia", label: "História", icon: "history" },
];
const order = ["inicio", "servicos", "historia", "cases"];

/**
 * Barra de abas inferior, no estilo de app, exibida só no celular (CSS).
 * A aba ativa acompanha a seção que está na tela; o botão central abre o formulário.
 */
export default function MobileTabBar() {
  const openContact = useContact();
  const [active, setActive] = useState("inicio");

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // A aba ativa é a última seção (na ordem da página) cujo topo já passou de 40% da tela.
        const line = window.innerHeight * 0.4;
        let current = "inicio";
        for (const id of order) {
          const top = document.getElementById(id)?.getBoundingClientRect().top;
          if (top !== undefined && top <= line) current = id;
        }
        setActive(current);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  const tab = (item: Tab) => (
    <a
      key={item.id}
      href={`#${item.id}`}
      className={`tabbar-item ${active === item.id ? "active" : ""}`}
      aria-current={active === item.id ? "location" : undefined}
    >
      <Icon name={item.icon} size={22} />
      <span>{item.label}</span>
    </a>
  );

  return (
    <nav className="tabbar" aria-label="Navegação rápida">
      {left.map(tab)}
      <button type="button" className="tabbar-item tabbar-main" onClick={() => openContact()}>
        <span className="tabbar-fab">
          <Icon name="plus" size={24} />
        </span>
        <span>Orçamento</span>
      </button>
      {right.map(tab)}
    </nav>
  );
}
