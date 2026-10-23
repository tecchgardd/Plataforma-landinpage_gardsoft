import type { ReactNode } from "react";
import Logo, { LogoMark } from "@/components/brand/Logo";

export default function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="auth-page">
      <div className="auth-art" aria-hidden="true">
        <div className="auth-grid" />
        <div className="auth-mark">
          <LogoMark size={220} animated />
        </div>
        <p>
          Tecnologia que
          <br />
          impulsiona negócios.
        </p>
      </div>
      <div className="auth-panel">
        <div className="auth-card">
          <Logo size={34} tagline />
          <h1>{title}</h1>
          <p>{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}
