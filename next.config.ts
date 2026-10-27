import type { NextConfig } from "next";
import { contentSecurityPolicy, securityHeaders } from "./src/lib/csp";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Indicador do modo desenvolvimento no canto direito (no esquerdo ficava sobre o "Ver site" do menu).
  devIndicators: { position: "bottom-right" },
  // O gerador de PDF e o cliente SMTP rodam como pacotes Node (fora do bundle).
  serverExternalPackages: ["@react-pdf/renderer", "nodemailer"],
  experimental: {
    serverActions: { bodySizeLimit: "11mb" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Site público (estático). O portal e as páginas por link recebem a CSP com nonce no proxy;
      // as rotas de API definem a própria (os downloads usam uma ainda mais restrita).
      {
        source: "/((?!admin|contrato|orcamento|documento|api).*)",
        headers: [{ key: "Content-Security-Policy", value: contentSecurityPolicy() }],
      },
    ];
  },
};
export default nextConfig;
