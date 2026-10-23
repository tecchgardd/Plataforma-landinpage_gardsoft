"use client";

import { useEffect, useState } from "react";
import Logo from "@/components/brand/Logo";
import Icon from "@/components/ui/Icon";
import { useContact } from "@/components/contact/ContactProvider";
import { nav } from "@/data/site";

export default function Header() {
  const openContact = useContact();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`header ${scrolled ? "scrolled" : ""} ${menuOpen ? "menu-open" : ""}`}>
      <div className="header-inner">
        <a href="#inicio" className="header-brand" aria-label="Gardsoft — início">
          <Logo size={30} />
        </a>
        <nav aria-label="Principal" className="header-nav">
          {nav.map((item) => (
            <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)}>
              {item.label}
            </a>
          ))}
        </nav>
        <button type="button" className="btn btn-sm header-cta" onClick={() => openContact()}>
          Fale com a gente <Icon name="arrow" size={16} />
        </button>
        <button
          type="button"
          className="menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
        >
          <span />
          <span />
        </button>
      </div>
    </header>
  );
}
