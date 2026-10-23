import Icon from "@/components/ui/Icon";
import type { SiteContent } from "@/lib/content-schema";

type Testimonial = SiteContent["testimonials"]["items"][number];

function Card({ item }: { item: Testimonial }) {
  return (
    <figure className="testimonial">
      <div className="stars" aria-label="5 de 5 estrelas">
        {Array.from({ length: 5 }, (_, i) => (
          <Icon key={i} name="star" size={16} />
        ))}
      </div>
      <blockquote>“{item.text}”</blockquote>
      <figcaption>
        <span className="avatar">{item.name.charAt(0)}</span>
        <span>
          <strong>{item.name}</strong>
          <small>{item.role}</small>
        </span>
      </figcaption>
    </figure>
  );
}

export default function Testimonials({ content }: { content: SiteContent["testimonials"] }) {
  const testimonials = content.items;
  if (testimonials.length === 0) return null;
  const half = Math.ceil(testimonials.length / 2);
  const rows = [testimonials.slice(0, half), testimonials.slice(half)];
  return (
    <section id="avaliacoes" className="section testimonials">
      <div className="container section-head center" data-reveal>
        <span className="eyebrow">{content.eyebrow}</span>
        <h2>
          {content.title} <span className="gradient-text">{content.highlight}</span>
        </h2>
        {content.text && <p>{content.text}</p>}
      </div>
      <div className="testimonial-rows">
        {rows.map((row, r) => (
          <div key={r} className={`testimonial-row ${r % 2 ? "reverse" : ""}`}>
            <div className="testimonial-track">
              {[...row, ...row].map((item, i) => (
                <Card key={i} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
