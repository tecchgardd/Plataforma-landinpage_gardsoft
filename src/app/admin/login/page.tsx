import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import AuthCard from "../_components/AuthCard";
import LoginForm from "./LoginForm";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");
  return (
    <AuthCard title="Bem-vindo de volta" subtitle="Entre para gerenciar o site, os leads e os projetos.">
      <LoginForm />
    </AuthCard>
  );
}
