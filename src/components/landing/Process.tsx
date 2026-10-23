import Icon from "@/components/ui/Icon";
import { ContactButton } from "@/components/contact/ContactProvider";
import type { SiteContent } from "@/lib/content-schema";

export default function Process({ content }: { content: SiteContent["process"] }) {
  const steps = content.items;
  return (
    <section id="processo" className="section process">
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

        <div className="steps-wrap" data-reveal>
          <div className="steps-line" aria-hidden="true">
            <span />
          </div>
          <ol className="steps">
            {steps.map((step, i) => (
              <li key={step.title} className="step spotlight" style={{ ["--d" as string]: `${200 + i * 160}ms` }}>
                <span className="step-num">
                  <span>{String(i + 1).padStart(2, "0")}</span>
                </span>
                <span className="step-detail">{step.detail}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="process-cta" data-reveal>
          <p>{content.ctaText}</p>
          <ContactButton className="btn btn-glow">
            {content.ctaButton} <Icon name="arrow" size={16} />
          </ContactButton>
        </div>
      </div>
    </section>
  );
}
