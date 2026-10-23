import { LogoMark } from "@/components/brand/Logo";
import Icon from "@/components/ui/Icon";
import { ContactButton } from "@/components/contact/ContactProvider";
import { whatsappLink } from "@/data/site";
import type { SiteContent } from "@/lib/content-schema";

type Content = SiteContent["banners"];

/** Banner azul de chamada principal: "tire sua ideia do papel". */
export function IdeaBanner({ content }: { content: Content }) {
  return (
    <section className="banner-wrap container" aria-label="Chamada para ação">
      <div className="banner banner-blue" data-reveal>
        <div className="banner-grid" aria-hidden="true" />
        <div className="banner-beam" aria-hidden="true" />
        <div className="banner-paper" aria-hidden="true">
          <span className="paper-sheet">
            <i />
            <i />
            <i />
            <i />
          </span>
          <span className="paper-arrow">→</span>
          <span className="paper-screen">
            <LogoMark size={34} />
          </span>
        </div>
        <div className="banner-copy">
          <span className="eyebrow light">{content.ideaKicker}</span>
          <h2>{content.ideaTitle}</h2>
          <p>{content.ideaText}</p>
        </div>
        <ContactButton className="btn btn-white btn-lg">
          {content.ideaCta} <Icon name="arrow" size={18} />
        </ContactButton>
      </div>
    </section>
  );
}

/** Banner claro com dois blocos de chamada. */
export function SplitBanner({ content, whatsapp }: { content: Content; whatsapp: string }) {
  const wa = whatsappLink(whatsapp, "Olá, Gardsoft! Quero conversar sobre um projeto.");
  return (
    <section className="banner-wrap container split-banners" aria-label="Chamadas para ação">
      <div className="banner banner-light spotlight" data-reveal>
        <span className="banner-kicker">{content.leftKicker}</span>
        <h3>{content.leftTitle}</h3>
        <p>{content.leftText}</p>
        <ContactButton service="Site institucional" className="btn">
          {content.leftCta} <Icon name="arrow" size={16} />
        </ContactButton>
        <div className="banner-orb" aria-hidden="true" />
      </div>
      <div className="banner banner-dark spotlight" data-reveal style={{ ["--d" as string]: "120ms" }}>
        <span className="banner-kicker">{content.rightKicker}</span>
        <h3>{content.rightTitle}</h3>
        <p>{content.rightText}</p>
        {wa ? (
          <a className="btn btn-white" href={wa} target="_blank" rel="noopener noreferrer">
            <Icon name="whatsapp" size={18} /> Chamar no WhatsApp
          </a>
        ) : (
          <ContactButton service="Sistema" className="btn btn-white">
            {content.rightCta} <Icon name="arrow" size={16} />
          </ContactButton>
        )}
        <div className="banner-code" aria-hidden="true">
          {"{ automação: true }"}
        </div>
      </div>
    </section>
  );
}
