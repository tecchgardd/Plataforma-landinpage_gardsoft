"use client";

import { useState } from "react";

const mediumByChannel: Record<string, string> = {
  instagram: "social",
  facebook: "social",
  tiktok: "social",
  linkedin: "social",
  youtube: "video",
  google: "cpc",
  whatsapp: "mensagem",
  email: "email",
  indicacao: "indicacao",
  offline: "qrcode",
  evento: "qrcode",
};

/**
 * Link do site com UTM, um por canal. Quem chega por ele e envia o formulário
 * vira lead desta campanha automaticamente.
 */
export default function UtmLink({
  origin,
  slug,
  channels,
}: {
  origin: string;
  slug: string;
  channels: { value: string; label: string }[];
}) {
  const [channel, setChannel] = useState(channels[0]?.value ?? "outro");
  const [copied, setCopied] = useState(false);
  const url = `${origin.replace(/\/$/, "")}/?${new URLSearchParams({
    utm_source: channel,
    utm_medium: mediumByChannel[channel] ?? "outro",
    utm_campaign: slug,
  })}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* o usuário pode copiar manualmente */
    }
  }

  return (
    <section className="adm-card adm-utm">
      <div>
        <h2>Link rastreável</h2>
        <p className="adm-card-sub">
          Use no anúncio, na bio ou no QR code do flyer. Quem entrar por ele e enviar o formulário vira lead desta campanha.
        </p>
      </div>
      <div className="adm-utm-row">
        <label className="adm-field">
          <span className="adm-label">Canal</span>
          <select value={channel} onChange={(e) => setChannel(e.target.value)}>
            {channels.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <code className="adm-code">{url}</code>
        <button type="button" className="adm-btn" onClick={copy}>
          {copied ? "Copiado!" : "Copiar link"}
        </button>
      </div>
    </section>
  );
}
