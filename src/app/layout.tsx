import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { DM_Sans, JetBrains_Mono, Sora } from "next/font/google";
import { site } from "@/data/site";
import "./globals.css";

const display = Sora({ subsets: ["latin"], variable: "--font-display", weight: ["400", "600", "700", "800"] });
const body = DM_Sans({ subsets: ["latin"], variable: "--font-body" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500"] });

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
  icons: { icon: "/icon.svg", apple: "/assets/gardsoft-logo.jpeg" },
  openGraph: {
    title: site.title,
    description: site.description,
    locale: "pt_BR",
    type: "website",
    images: ["/assets/gardsoft-logo.jpeg"],
  },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        {/* Marca a página como "com JS" antes da pintura, evitando piscar nas animações de entrada. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
