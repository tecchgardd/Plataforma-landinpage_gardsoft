"use client";

import { useState } from "react";

/** Link de assinatura com botão de copiar e atalho para enviar pelo WhatsApp. */
export default function CopyLink({ url, phone, message }: { url: string; phone?: string | null; message: string }) {
  const [copied, setCopied] = useState(false);
  const digits = (phone ?? "").replace(/\D/g, "");
  const wa = digits.length >= 10 ? `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}?text=${encodeURIComponent(`${message}\n${url}`)}` : null;
  return (
    <div className="adm-copylink">
      <code className="adm-code">{url}</code>
      <div className="adm-copylink-actions">
        <button
          type="button"
          className="adm-btn ghost small"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* copiar manualmente */
            }
          }}
        >
          {copied ? "Copiado!" : "Copiar link"}
        </button>
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" className="adm-btn whatsapp small">
            Enviar no WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
