import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import { getAccess } from "@/lib/access";
import { levels, modules } from "@/lib/permissions";

export const metadata = { title: "Sem acesso" };

/** Para onde vai quem tenta abrir (ou alterar) algo que o perfil não permite. */
export default async function NoAccessPage({ searchParams }: { searchParams: Promise<{ modulo?: string; nivel?: string }> }) {
  const access = await getAccess();
  const { modulo, nivel } = await searchParams;
  const module = modules.find((m) => m.key === modulo);
  const needed = levels.find((l) => String(l.value) === nivel);
  return (
    <>
      <PageHeader title="Sem acesso" subtitle="Seu perfil não permite esta ação." />
      <section className="adm-card adm-empty-state">
        <p>
          {module ? (
            <>
              Para isso é preciso o nível <strong>{needed?.label ?? "Ver"}</strong> em <strong>{module.label}</strong>.
            </>
          ) : (
            "Você não tem permissão para esta página."
          )}{" "}
          Seu perfil atual é <strong>{access?.role?.name ?? "sem perfil"}</strong>.
        </p>
        <p className="adm-card-sub">Se precisar desse acesso, peça a um administrador para ajustar o seu perfil em Administração → Perfis de acesso.</p>
        <Link href="/admin/perfil" className="adm-btn ghost">
          Ver meu perfil
        </Link>
      </section>
    </>
  );
}
