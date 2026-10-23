import Icon from "@/components/ui/Icon";
import { ContactButton } from "@/components/contact/ContactProvider";
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

        <div className="cases-grid">
          {cases.map((item, i) => (
            <a
              key={item.name}
              href={item.url || undefined}
              target="_blank"
              rel="noopener noreferrer"
              className={`case-card case-${item.theme}`}
              data-reveal
              style={{ ["--d" as string]: `${i * 110}ms` }}
            >
              <div className="case-preview">
                <div className="case-browser">
                  <div className="case-bar">
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
                        aria-label={`Vídeo do projeto ${item.name}`}
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="metadata"
                      />
                    </div>
                  ) : item.image ? (
                    <div className="case-screen case-photo">
                      <img src={mediaUrl(item.image, { width: 1280 })} alt={`Página do projeto ${item.name}`} loading="lazy" />
                    </div>
                  ) : (
                    <div className="case-screen">
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
                <span className="case-live">
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
                  <span className="case-arrow">
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
          ))}

          <div className="case-card case-next" data-reveal style={{ ["--d" as string]: `${cases.length * 110}ms` }}>
            <div className="case-next-inner">
              <span className="case-plus">+</span>
              <h3>{content.nextTitle}</h3>
              <p>{content.nextText}</p>
              <ContactButton className="btn">
                {content.nextCta} <Icon name="arrow" size={16} />
              </ContactButton>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
