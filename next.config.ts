import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // O gerador de PDF roda como pacote Node (fora do bundle).
  serverExternalPackages: ["@react-pdf/renderer"],
  experimental: {
    serverActions: { bodySizeLimit: "11mb" },
  },
};
export default nextConfig;
