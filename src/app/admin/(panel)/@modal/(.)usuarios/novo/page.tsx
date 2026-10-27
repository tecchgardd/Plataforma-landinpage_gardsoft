import RouteModal from "@/components/admin/RouteModal";
import NewUserPage from "@/app/admin/(panel)/usuarios/novo/page";

/** Aberto pela lista: mostra a mesma página dentro da janela central. */
export default function Modal() {
  return (
    <RouteModal>
      <NewUserPage />
    </RouteModal>
  );
}
