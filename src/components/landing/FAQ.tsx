import type { SiteContent } from "@/lib/content-schema";

export default function FAQ({ content }: { content: SiteContent["faq"] }) {
  const faq = content.items;
  if (faq.length === 0) return null;
  return (
    <section className="section faq">
      <div className="container faq-inner">
        <div data-reveal>
          <span className="eyebrow">{content.eyebrow}</span>
          <h2>
            {content.title} <span className="gradient-text">{content.highlight}</span>
          </h2>
          {content.text && <p>{content.text}</p>}
        </div>
        <div className="questions" data-reveal>
          {faq.map((item, i) => (
            <details key={item.q} name="faq" open={i === 0}>
              <summary>
                {item.q}
                <span className="faq-plus" aria-hidden="true" />
              </summary>
              <p>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
