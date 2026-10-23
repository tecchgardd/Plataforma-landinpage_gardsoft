import type { ReactNode } from "react";
import Logo from "@/components/brand/Logo";
import { whatsappLink } from "@/data/site";
import type { LegalInfo } from "@/lib/legal";

export const legalLinks = [
  { href: "/privacidade", label: "Política de privacidade" },
  { href: "/termos", label: "Termos de serviço" },
  { href: "/reembolso", label: "Política de reembolso" },
];

/** "Gardsoft (Razão Social Ltda), CNPJ 00.000.000/0001-00" — só com o que estiver preenchido. */
export function companyLine(info: LegalInfo) {
  const name = info.legalName !== info.tradeName ? `${info.tradeName} (${info.legalName})` : info.tradeName;
  return [name, info.document && `CNPJ ${info.document}`].filter(Boolean).join(", ");
}

/** Canais para falar com a empresa sobre dados pessoais e contratos. */
export function ContactChannels({ info }: { info: LegalInfo }) {
  const wa = whatsappLink(info.whatsapp, "Olá, Gardsoft! Tenho uma dúvida sobre meus dados / políticas do site.");
  return (
    <ul>
      {info.email && (
        <li>
          E-mail: <a href={`mailto:${info.email}`}>{info.email}</a>
        </li>
      )}
      {wa && (
        <li>
          WhatsApp:{" "}
          <a href={wa} target="_blank" rel="noopener noreferrer">
            falar com a Gardsoft
          </a>
        </li>
      )}
      {info.address && <li>Endereço: {[info.address, info.cityState].filter(Boolean).join(" — ")}</li>}
    </ul>
  );
}

export default function LegalPage({
  title,
  updated,
  intro,
  info,
  children,
}: {
  title: string;
  updated: string;
  intro: ReactNode;
  info: LegalInfo;
  children: ReactNode;
}) {
  return (
    <>
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      <header className="legal-header">
        <div className="container legal-header-inner">
          <a href="/" aria-label="Gardsoft — voltar para a página inicial">
            <Logo size={28} />
          </a>
          <a href="/" className="legal-back">
            ← Voltar ao site
          </a>
        </div>
      </header>
      <main id="conteudo" className="legal">
        <div className="container legal-inner">
          <span className="eyebrow">Transparência</span>
          <h1>{title}</h1>
          <p className="legal-updated">Última atualização: {updated}</p>
          <div className="legal-intro">{intro}</div>
          <div className="legal-body">{children}</div>
        </div>
      </main>
      <footer className="legal-footer">
        <div className="container legal-footer-inner">
          <span>{companyLine(info)}</span>
          <nav aria-label="Políticas">
            {legalLinks.map((link) => (
              <a key={link.href} href={link.href}>
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </footer>
    </>
  );
}
