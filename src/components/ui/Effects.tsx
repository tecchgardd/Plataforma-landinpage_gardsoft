"use client";

import { useEffect } from "react";

/**
 * Efeitos globais da página:
 * - revela elementos com [data-reveal] ao entrarem na tela;
 * - brilho que segue o cursor em elementos .spotlight;
 * - barra de progresso de rolagem.
 */
export default function Effects() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));

    function onPointerMove(event: PointerEvent) {
      const card = (event.target as Element | null)?.closest<HTMLElement>(".spotlight");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    }

    let frame = 0;
    function onScroll() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = root.scrollHeight - root.clientHeight;
        root.style.setProperty("--scroll", String(max > 0 ? root.scrollTop / max : 0));
      });
    }

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      observer.disconnect();
      document.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return <div className="scroll-progress" aria-hidden="true" />;
}
