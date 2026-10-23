import { LogoMark } from "@/components/brand/Logo";
import Icon from "@/components/ui/Icon";
import type { SiteContent } from "@/lib/content-schema";

export default function Story({ story }: { story: SiteContent["story"] }) {
  return (
    <section id="historia" className="section story">
      <div className="container story-inner">
        <div className="story-aside" data-reveal>
          <span className="eyebrow">{story.eyebrow}</span>
          <h2>
            {story.title} <span className="gradient-text">{story.highlight}</span>
          </h2>
          {story.text && <p className="story-intro">{story.text}</p>}
          <figure className="story-quote">
            <Icon name="quote" size={30} />
            <blockquote>{story.quote}</blockquote>
            <figcaption>
              <LogoMark size={26} /> {story.quoteAuthor}
            </figcaption>
          </figure>
        </div>

        <ol className="timeline">
          {story.chapters.map((chapter, i) => (
            <li key={chapter.title} className="timeline-item" data-reveal style={{ ["--d" as string]: `${i * 80}ms` }}>
              <span className="timeline-dot">{String(i + 1).padStart(2, "0")}</span>
              <div className="timeline-card spotlight">
                <span className="timeline-label">{chapter.label}</span>
                <h3>{chapter.title}</h3>
                <p>{chapter.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="container">
        <div className="values" data-reveal>
          {story.values.map((value) => (
            <div key={value.title} className="value">
              <strong>{value.title}</strong>
              <span>{value.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
