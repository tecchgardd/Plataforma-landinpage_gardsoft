import type { ReactNode } from "react";
import Link from "next/link";
import Sidebar from "@/components/admin/Sidebar";
import MobileNav from "@/components/admin/MobileNav";
import TableLabels from "@/components/admin/TableLabels";
import { usesDefaultPassword } from "@/lib/auth";
import { requireUser } from "@/lib/session";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const weakPassword = await usesDefaultPassword(user.id);
  return (
    <div className="adm-shell">
      <Sidebar name={user.name} email={user.email} image={user.image ?? null} />
      <main className="adm-main">
        {weakPassword && (
          <div className="adm-alert" role="alert">
            <strong>Você está usando a senha padrão “admin”.</strong> Troque antes de publicar o site.
            <Link href="/admin/perfil">Trocar senha →</Link>
          </div>
        )}
        {children}
      </main>
      <MobileNav name={user.name} email={user.email} image={user.image ?? null} />
      <TableLabels />
    </div>
  );
}
