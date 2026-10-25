import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import MobileNav from "@/components/admin/MobileNav";
import TableLabels from "@/components/admin/TableLabels";
import { usesDefaultPassword } from "@/lib/auth";
import { getAccess } from "@/lib/access";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const access = await getAccess();
  if (!access) redirect("/admin/login");
  const { user, levels } = access;
  const weakPassword = await usesDefaultPassword(user.id);
  return (
    <div className="adm-shell">
      <Sidebar name={user.name} email={user.email} image={user.image ?? null} levels={levels} />
      <main className="adm-main">
        {weakPassword && (
          <div className="adm-alert" role="alert">
            <strong>Você está usando a senha padrão “admin”.</strong> Troque antes de publicar o site.
            <Link href="/admin/perfil">Trocar senha →</Link>
          </div>
        )}
        {children}
      </main>
      <MobileNav name={user.name} email={user.email} image={user.image ?? null} levels={levels} />
      <TableLabels />
    </div>
  );
}
