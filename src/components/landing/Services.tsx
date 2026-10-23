import Icon from "@/components/ui/Icon";
import { ContactButton } from "@/components/contact/ContactProvider";
import type { SiteContent } from "@/lib/content-schema";


export function Marquee({ items }: { items: string[] }) {
  return (
    <div className="marquee-wrap" aria-hidden="true">
      <div className="marquee">
        <div className="marquee-track">
          {[...items, ...items].map((item, i) => (
            <span key={i}>
              {item}
              <Icon name="sparkle" size={18} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Services({ content }: { content: SiteContent["services"] }) {
  const services = content.items;
  return (
    <section id="servicos" className="section services">
      <div className="container">
        <div className="section-head" data-reveal>
          <span className="eyebrow">{content.eyebrow}</span>
          <h2>
            {content.title} <span className="gradient-text">{content.highlight}</span>
          </h2>
          {content.text && <p>{content.text}</p>}
        </div>

        <div className="services-grid">
          {services.map((service, i) => (
            <article
              key={service.title}
              className={`service-card spotlight service-${service.icon}`}
              data-reveal
              style={{ ["--d" as string]: `${i * 90}ms` }}
            >
              <div className="service-top">
                <span className="service-icon">
                  <Icon name={service.icon} size={26} />
                </span>
                <span className="service-num">0{i + 1}</span>
              </div>
              <span className="service-tag">{service.tag}</span>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <ul>
                {service.features.map((feature) => (
                  <li key={feature}>
                    <Icon name="check" size={15} /> {feature}
                  </li>
                ))}
              </ul>
              <ContactButton service={service.contact} className="link-arrow">
                Quero {service.title.toLowerCase()} <Icon name="arrow" size={16} />
              </ContactButton>
              <div className="service-deco" aria-hidden="true" />
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
