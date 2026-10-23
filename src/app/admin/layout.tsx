import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./admin.css";

// O portal depende da sessão e do banco: nunca gerar estaticamente.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Portal Gardsoft", template: "%s · Portal Gardsoft" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className="adm-root">{children}</div>;
}
