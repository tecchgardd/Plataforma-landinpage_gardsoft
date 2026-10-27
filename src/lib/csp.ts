import { createHash } from "node:crypto";

/**
 * Políticas de segurança de conteúdo (CSP). Usado pelo proxy (portal e páginas por link, com nonce
 * por requisição) e pelo next.config (site público, que é estático e não tem como receber nonce).
 */

/** Único script inline escrito à mão (layout raiz): marca a página como "com JS" antes da pintura. */
export const HAS_JS_SCRIPT = "document.documentElement.classList.add('js')";
const hasJsHash = `'sha256-${createHash("sha256").update(HAS_JS_SCRIPT).digest("base64")}'`;

const isDev = process.env.NODE_ENV === "development";

/**
 * Sem nonce: aceita scripts inline (o HTML estático do Next precisa), mas só do próprio site.
 * Com nonce: só roda script com o nonce da requisição (ou carregado por um deles) — XSS injetado não executa.
 */
export function contentSecurityPolicy(nonce?: string) {
  const scripts = nonce ? `'nonce-${nonce}' 'strict-dynamic' ${hasJsHash}` : "'self' 'unsafe-inline'";
  return [
    "default-src 'self'",
    // Em desenvolvimento o React usa eval para mostrar as pilhas de erro.
    `script-src ${scripts}${isDev ? " 'unsafe-eval'" : ""}`,
    // Atributos style={...} do React são estilos inline.
    "style-src 'self' 'unsafe-inline'",
    // Imagens do conteúdo do site podem vir de qualquer endereço https (ex.: Cloudinary).
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    // Envio direto de fotos e vídeos ao Cloudinary; em desenvolvimento, o recarregamento automático.
    `connect-src 'self' https://api.cloudinary.com${isDev ? " ws: wss:" : ""}`,
    // Relatório incorporado no BI.
    "frame-src https://app.powerbi.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

/** Cabeçalhos de segurança de todas as respostas. */
export const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];
