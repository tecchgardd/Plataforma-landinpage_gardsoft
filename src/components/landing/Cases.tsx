import Icon from "@/components/ui/Icon";
import { ContactButton } from "@/components/contact/ContactProvider";
import CasesCarousel from "@/components/landing/CasesCarousel";
import type { SiteContent } from "@/lib/content-schema";
import { mediaUrl } from "@/lib/media";

function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export default function Cases({ content }: { content: SiteContent["cases"] }) {
  const cases = content.items.filter((item) => item.published);
  const total = cases.length + 1;
  return (
    <section id="cases" className="section cases">
      <div className="container">
        <div className="section-head split" data-reveal>
          <div>
            <span className="eyebrow">{content.eyebrow}</span>
            <h2>
              {content.title} <span className="gradient-text">{content.highlight}</span>
            </h2>
          </div>
          {content.text && <p>{content.text}</p>}
        </div>

        <CasesCarousel total={total}>
          {cases.map((item, i) => (
            <li key={item.name} className="cases-slide" aria-roledescription="slide" aria-label={`${i + 1} de ${total}: ${item.name}`}>
              <a
                href={item.url || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`case-card case-${item.theme}`}
                aria-label={`${item.name} — ${item.type}. Abrir o site em uma nova aba`}
              >
                <div className="case-preview">
                  <div className="case-browser">
                    <div className="case-bar" aria-hidden="true">
                      <i />
                      <i />
                      <i />
                      <span>{hostname(item.url)}</span>
                    </div>
                    {item.video ? (
                      <div className="case-screen case-photo">
                        <video
                          src={mediaUrl(item.video, { width: 1280 })}
                          poster={item.image ? mediaUrl(item.image, { width: 1280 }) : undefined}
                          aria-label={`Vídeo do site ${item.name}`}
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="metadata"
                        />
                      </div>
                    ) : item.image ? (
                      <div className="case-screen case-photo">
                        <img
                          src={mediaUrl(item.image, { width: 1280 })}
                          alt={`Página inicial do site ${item.name}: ${item.headline}`}
                          width={1440}
                          height={900}
                          loading={i < 2 ? "eager" : "lazy"}
                          decoding="async"
                        />
                      </div>
                    ) : (
                      <div className="case-screen" aria-hidden="true">
                        <div className="case-nav">
                          <b>{item.name}</b>
                          <span />
                          <span />
                          <span />
                        </div>
                        <small>{item.kicker}</small>
                        <strong>{item.headline}</strong>
                        <span className="case-btn" />
                        <div className="case-art" />
                      </div>
                    )}
                  </div>
                  <span className="case-live" aria-hidden="true">
                    <span className="pulse-dot" /> Ver ao vivo
                  </span>
                </div>
                <div className="case-info">
                  <div className="case-meta">
                    <span>{item.type}</span>
                    <span>{item.segment}</span>
                  </div>
                  <h3>
                    {item.name}
                    <span className="case-arrow" aria-hidden="true">
                      <Icon name="arrow" size={18} />
                    </span>
                  </h3>
                  <p>{item.summary}</p>
                  <div className="case-tags">
                    {item.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </a>
            </li>
          ))}

          <li className="cases-slide" aria-roledescription="slide" aria-label={`${total} de ${total}: ${content.nextTitle}`}>
            <div className="case-card case-next">
              <div className="case-next-inner">
                <span className="case-plus" aria-hidden="true">
                  +
                </span>
                <h3>{content.nextTitle}</h3>
                <p>{content.nextText}</p>
                <ContactButton className="btn">
                  {content.nextCta} <Icon name="arrow" size={16} />
                </ContactButton>
              </div>
            </div>
          </li>
        </CasesCarousel>
      </div>
    </section>
  );
}
