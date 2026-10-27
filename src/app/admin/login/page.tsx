import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AuthCard from "../_components/AuthCard";
import LoginForm from "./LoginForm";

export const metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expirou?: string; fechou?: string }> }) {
  if (await getSession()) redirect("/admin");
  const params = await searchParams;
  const expired = params.expirou === "1";
  const closed = params.fechou === "1";
  return (
    <AuthCard title="Bem-vindo de volta" subtitle="Entre para gerenciar o site, os leads e os projetos.">
      {expired && (
        <p role="status" className="login-expired">
          Sua sessão expirou (o acesso vale por 4 horas). Entre novamente para continuar.
        </p>
      )}
      {closed && (
        <p role="status" className="login-expired">
          Sua sessão foi encerrada porque o portal foi fechado. Entre novamente para continuar.
        </p>
      )}
      <LoginForm />
    </AuthCard>
  );
}
