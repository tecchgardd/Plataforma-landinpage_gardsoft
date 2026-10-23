"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/ui/Icon";

/**
 * Trilho horizontal com rolagem por "snap". Os cards vêm prontos do servidor;
 * aqui ficam só as setas, a barra de progresso e as setas do teclado.
 */
export default function CasesCarousel({ total, children }: { total: number; children: ReactNode }) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [state, setState] = useState({ start: true, end: false, progress: 0, current: 1 });

  const update = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    const progress = max > 0 ? track.scrollLeft / max : 1;
    const step = (track.firstElementChild as HTMLElement | null)?.offsetWidth ?? track.clientWidth;
    setState({
      start: track.scrollLeft <= 4,
      end: track.scrollLeft >= max - 4,
      progress,
      current: Math.min(total, Math.round(track.scrollLeft / step) + 1),
    });
  }, [total]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    update();
    track.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      track.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const go = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild as HTMLElement | null;
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy({ left: dir * ((card?.offsetWidth ?? track.clientWidth) + gap), behavior: reduce ? "auto" : "smooth" });
  };

  return (
    <div
      className="cases-carousel"
      data-reveal
      role="region"
      aria-roledescription="carrossel"
      aria-label="Cases de sucesso"
      onKeyDown={(event) => {
        if (event.key === "ArrowRight") go(1);
        else if (event.key === "ArrowLeft") go(-1);
        else return;
        event.preventDefault();
      }}
    >
      <ul ref={trackRef} id="cases-track" className="cases-track">
        {children}
      </ul>

      <div className="cases-controls">
        <div className="cases-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${Math.max(0.08, state.progress)})` }} />
        </div>
        <span className="cases-count" aria-live="polite">
          <b>{String(state.current).padStart(2, "0")}</b> / {String(total).padStart(2, "0")}
        </span>
        <button type="button" className="cases-nav" aria-controls="cases-track" aria-label="Case anterior" disabled={state.start} onClick={() => go(-1)}>
          <Icon name="chevronLeft" size={20} />
        </button>
        <button type="button" className="cases-nav" aria-controls="cases-track" aria-label="Próximo case" disabled={state.end} onClick={() => go(1)}>
          <Icon name="chevronRight" size={20} />
        </button>
      </div>
    </div>
  );
}
