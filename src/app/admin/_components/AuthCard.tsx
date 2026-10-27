import Link from "next/link";
import type { ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";
import LoginBackground from "./LoginBackground";

/** Tela de entrada do portal: vídeo de fundo, onda animada e o cartão escuro no centro. */
export default function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="login-page">
      <LoginBackground />
      <main className="login-card">
        <div className="login-wave" aria-hidden="true">
          <svg viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path className="w1" d="M0 192c120-32 240-64 360-53s240 64 360 75 240-21 360-43 240-32 360-21v170H0z" />
            <path className="w2" d="M0 224c96 11 192 21 312 5s264-59 384-64 216 32 336 43 288-11 408-27v139H0z" />
          </svg>
        </div>
        <div className="login-brand">
          <span className="login-mark">
            <LogoMark size={52} animated />
          </span>
          <span className="login-word">
            GARD<b>SOFT</b>
          </span>
          <small>Tecnologia que impulsiona negócios</small>
        </div>
        <h1>{title}</h1>
        <p className="login-sub">{subtitle}</p>
        {children}
        <p className="login-footer">
          Ao entrar você concorda com a nossa <Link href="/privacidade">política de privacidade</Link> e os{" "}
          <Link href="/termos">termos de uso</Link>.
        </p>
      </main>
    </div>
  );
}
