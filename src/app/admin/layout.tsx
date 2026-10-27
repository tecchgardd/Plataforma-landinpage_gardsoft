import type { Metadata } from "next";
import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { THEME_COOKIE } from "@/lib/theme";
import "./admin.css";

// O portal depende da sessão e do banco: nunca gerar estaticamente.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Portal Gardsoft", template: "%s · Portal Gardsoft" },
  robots: { index: false, follow: false },
};

export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  // O tema vem do cookie para a página já chegar com as cores certas (sem piscar o claro antes do escuro).
  const theme = (await cookies()).get(THEME_COOKIE)?.value === "dark" ? "dark" : "light";
  return (
    <div className="adm-root" data-theme={theme}>
      {children}
    </div>
  );
}
