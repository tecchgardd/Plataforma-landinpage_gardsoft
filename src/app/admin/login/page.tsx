import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AuthCard from "../_components/AuthCard";
import LoginForm from "./LoginForm";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expirou?: string }> }) {
  if (await getSession()) redirect("/admin");
  const expired = (await searchParams).expirou === "1";
  return (
    <AuthCard title="Bem-vindo de volta" subtitle="Entre para gerenciar o site, os leads e os projetos.">
      {expired && (
        <p role="status" className="adm-msg auth-expired">
          Sua sessão expirou (o acesso vale por 4 horas). Entre novamente para continuar.
        </p>
      )}
      <LoginForm />
    </AuthCard>
  );
}
