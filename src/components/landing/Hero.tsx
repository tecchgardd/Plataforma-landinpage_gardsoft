import { LogoMark } from "@/components/brand/Logo";
import Icon from "@/components/ui/Icon";
import { ContactButton } from "@/components/contact/ContactProvider";
import NetworkCanvas from "./NetworkCanvas";
import type { SiteContent } from "@/lib/content-schema";
import { CodeTyper, RotatingWord } from "./HeroWidgets";

const orbitChips = ["Next.js", "React", "Node", "API", "Cloud", "UI/UX"];

export default function Hero({ content }: { content: SiteContent["hero"] }) {
  return (
    <section id="inicio" className="hero">
      <div className="hero-bg" aria-hidden="true">
        <div className="hero-grid" />
        <div className="blob blob-a" />
        <div className="blob blob-b" />
        <div className="blob blob-c" />
      </div>
      <NetworkCanvas />

      <div className="hero-inner container">
        <div className="hero-copy">
          <span className="badge hero-badge">
            <span className="pulse-dot" />
            {content.badge}
          </span>
          <h1 className="hero-title">
            <span className="line">
              <span>{content.line1}</span>
            </span>
            <span className="line">
              <span>{content.line2}</span>
            </span>
            <span className="line">
              <span className="gradient-text shine">{content.highlight}</span>
            </span>
          </h1>
          <p className="hero-typed">
            <span className="typed-prompt">{content.typedPrefix}</span> <RotatingWord words={content.typedWords} />
          </p>
          <p className="hero-lead">{content.lead}</p>
          <div className="hero-actions">
            <ContactButton className="btn btn-lg btn-glow">
              {content.primaryCta} <Icon name="arrow" size={18} />
            </ContactButton>
            <a className="btn btn-lg btn-ghost" href="#cases">
              {content.secondaryCta}
            </a>
          </div>
          {content.pillars.length > 0 && (
            <ul className="hero-pillars">
              {content.pillars.map((pillar) => (
                <li key={pillar}>
                  <Icon name="check" size={16} /> {pillar}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="hero-stage" aria-hidden="true">
          <div className="stage-glow" />
          <div className="ring ring-1">
            {orbitChips.slice(0, 3).map((chip, i) => (
              <span key={chip} className="orbit-chip" style={{ ["--i" as string]: i, ["--n" as string]: 3 }}>
                <span>{chip}</span>
              </span>
            ))}
          </div>
          <div className="ring ring-2">
            {orbitChips.slice(3).map((chip, i) => (
              <span key={chip} className="orbit-chip" style={{ ["--i" as string]: i, ["--n" as string]: 3 }}>
                <span>{chip}</span>
              </span>
            ))}
          </div>
          <div className="ring ring-3" />

          <div className="stage-mark">
            <div className="mark-halo" />
            <LogoMark size={170} animated />
            <div className="scan-line" />
          </div>

          <div className="glass-card code-card">
            <div className="card-top">
              <i />
              <i />
              <i />
              <span>projeto.ts</span>
            </div>
            <CodeTyper />
          </div>

          <div className="glass-card deploy-card">
            <span className="deploy-icon">
              <Icon name="check" size={16} />
            </span>
            <div>
              <strong>Deploy concluído</strong>
              <small>seunegocio.com.br está no ar</small>
            </div>
          </div>

          <div className="glass-card chart-card">
            <small>Novos contatos</small>
            <svg viewBox="0 0 160 60" className="spark">
              <defs>
                <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0" stopColor="#1a73ff" stopOpacity=".35" />
                  <stop offset="1" stopColor="#1a73ff" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path className="spark-area" d="M0 52 20 46 40 48 60 36 80 38 100 26 120 22 140 12 160 6V60H0Z" fill="url(#sparkFill)" />
              <path className="spark-line" pathLength={1} d="M0 52 20 46 40 48 60 36 80 38 100 26 120 22 140 12 160 6" />
            </svg>
            <span className="chart-up">▲ crescendo</span>
          </div>
        </div>
      </div>

      <a href="#servicos" className="scroll-hint" aria-label="Rolar para os serviços">
        <span className="mouse">
          <span />
        </span>
      </a>
    </section>
  );
}
