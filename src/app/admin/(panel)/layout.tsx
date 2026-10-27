import type { ReactNode } from "react";
import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Sidebar from "@/components/admin/Sidebar";
import MobileNav from "@/components/admin/MobileNav";
import TableLabels from "@/components/admin/TableLabels";
import SessionTimer from "@/components/admin/SessionTimer";
import SessionGuard from "@/components/admin/SessionGuard";
import { usesDefaultPassword } from "@/lib/auth";
import { getAccess } from "@/lib/access";
import { TAB_SESSION_HIDE_SCRIPT } from "@/lib/tab-session";

/** `modal`: formulários "Novo …" abertos pela lista numa janela central (ver @modal). */
export default async function PanelLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  const access = await getAccess();
  if (!access) redirect("/admin/login");
  const { user, role, levels, expiresAt } = access;
  const weakPassword = await usesDefaultPassword(user.id);
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <div className="adm-shell">
      {/* Aba reaberta depois de fechada: esconde os dados até o SessionGuard decidir (CSP exige o nonce). */}
      <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: TAB_SESSION_HIDE_SCRIPT }} />
      <Sidebar name={user.name} email={user.email} image={user.image ?? null} role={role?.name} levels={levels} />
      <main className="adm-main">
        {weakPassword && (
          <div className="adm-alert" role="alert">
            <strong>Você está usando a senha padrão “admin”.</strong> Troque antes de publicar o site.
            <Link href="/admin/perfil">Trocar senha →</Link>
          </div>
        )}
        {children}
      </main>
      {modal}
      <MobileNav name={user.name} email={user.email} image={user.image ?? null} levels={levels} />
      <TableLabels />
      <SessionTimer expiresAt={expiresAt.toISOString()} />
      <SessionGuard />
    </div>
  );
}
