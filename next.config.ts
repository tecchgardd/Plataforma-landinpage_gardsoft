import type { NextConfig } from "next";
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
};
export default nextConfig;
