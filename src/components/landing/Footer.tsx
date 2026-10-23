import Logo, { LogoMark } from "@/components/brand/Logo";
import Icon, { type IconName } from "@/components/ui/Icon";
import { ContactButton } from "@/components/contact/ContactProvider";
import { companyLine, legalLinks } from "@/components/legal/LegalPage";
import { type nav, whatsappLink } from "@/data/site";
import type { LegalInfo } from "@/lib/legal";
import type { Service, SiteContent, SiteSettings } from "@/lib/content-schema";

export function FinalCTA({ content }: { content: SiteContent["finalCta"] }) {
  return (
    <section id="contato" className="final-cta">
      <div className="final-bg" aria-hidden="true">
        <div className="final-grid" />
        <div className="final-mark">
          <LogoMark size={420} />
        </div>
      </div>
      <div className="container final-inner" data-reveal>
        <span className="badge badge-light">
          <span className="pulse-dot" /> {content.badge}
        </span>
        <h2>
          {content.title}
          <br />
          <span>{content.highlight}</span>
        </h2>
        <p>{content.text}</p>
        <div className="final-actions">
          <ContactButton className="btn btn-white btn-lg">
            {content.primaryCta} <Icon name="arrow" size={18} />
          </ContactButton>
          <a className="btn btn-outline-light btn-lg" href="#processo">
            {content.secondaryCta}
          </a>
        </div>
      </div>
    </section>
  );
}

export default function Footer({
  navItems,
  legal,
  settings,
  services,
  content,
}: {
  navItems: typeof nav;
  legal: LegalInfo;
  settings: SiteSettings;
  services: Service[];
  content: SiteContent["footer"];
}) {
  const wa = whatsappLink(settings.whatsapp, "Olá, Gardsoft!");
  const socials = [
    settings.instagram && { href: settings.instagram, icon: "instagram" as const, label: "Instagram" },
    settings.facebook && { href: settings.facebook, icon: "facebook" as const, label: "Facebook" },
    settings.linkedin && { href: settings.linkedin, icon: "linkedin" as const, label: "LinkedIn" },
    settings.tiktok && { href: settings.tiktok, icon: "tiktok" as const, label: "TikTok" },
    settings.youtube && { href: settings.youtube, icon: "youtube" as const, label: "YouTube" },
    wa && { href: wa, icon: "whatsapp" as const, label: "WhatsApp" },
  ].filter(Boolean) as { href: string; icon: IconName; label: string }[];

  return (
    <footer className="footer">
      <div className="container footer-top">
        <div className="footer-brand">
          <Logo size={40} tagline />
          <p>{content.description}</p>
          {socials.length > 0 && (
            <div className="socials">
              {socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}>
                  <Icon name={s.icon} size={18} />
                </a>
              ))}
            </div>
          )}
        </div>

        <nav className="footer-col" aria-label="Navegação do rodapé">
          <h3 className="footer-title">Navegação</h3>
          {navItems.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="footer-col">
          <h3 className="footer-title">Serviços</h3>
          {services.map((service) => (
            <a key={service.title} href="#servicos">
              {service.title}
            </a>
          ))}
        </div>

        <div className="footer-col footer-contact">
          <h3 className="footer-title">Contato</h3>
          {settings.email && (
            <a href={`mailto:${settings.email}`}>
              <Icon name="mail" size={16} /> {settings.email}
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer">
              <Icon name="whatsapp" size={16} /> WhatsApp
            </a>
          )}
          <p>{content.contactText}</p>
          <ContactButton className="btn btn-sm">
            Iniciar conversa <Icon name="arrow" size={15} />
          </ContactButton>
        </div>
      </div>

      <div className="footer-word" aria-hidden="true">
        GARDSOFT
      </div>

      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} Gardsoft. Todos os direitos reservados.</span>
        <span>{content.bottomText}</span>
        <a href="#inicio">Voltar ao topo ↑</a>
      </div>

      <div className="container footer-legal">
        <span>
          {companyLine(legal)}
          {legal.cityState && ` · ${legal.cityState}`}. Marcas e imagens dos cases pertencem aos respectivos clientes.
        </span>
        <nav aria-label="Políticas">
          {legalLinks.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}

export function WhatsAppFloat({ whatsapp }: { whatsapp: string }) {
  const wa = whatsappLink(whatsapp, "Olá, Gardsoft! Vim pelo site e quero conversar sobre um projeto.");
  if (wa)
    return (
      <a className="float-cta" href={wa} target="_blank" rel="noopener noreferrer" aria-label="Conversar no WhatsApp">
        <Icon name="whatsapp" size={26} />
      </a>
    );
  return (
    <ContactButton className="float-cta">
      <Icon name="whatsapp" size={26} />
      <span className="sr-only">Fale com a Gardsoft</span>
    </ContactButton>
  );
}
