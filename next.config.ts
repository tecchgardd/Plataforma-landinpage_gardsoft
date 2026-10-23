import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // O gerador de PDF e o cliente SMTP rodam como pacotes Node (fora do bundle).
  serverExternalPackages: ["@react-pdf/renderer", "nodemailer"],
  experimental: {
    serverActions: { bodySizeLimit: "11mb" },
  },
};
export default nextConfig;
