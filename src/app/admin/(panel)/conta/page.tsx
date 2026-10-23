import { redirect } from "next/navigation";

/** "Minha conta" virou "Perfil". */
export default function AccountPage() {
  redirect("/admin/perfil");
}
