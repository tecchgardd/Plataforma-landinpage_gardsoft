import RouteModal from "@/components/admin/RouteModal";
import NewRolePage from "@/app/admin/(panel)/perfis/novo/page";

/** Aberto pela lista: mostra a mesma página dentro da janela central. */
export default function Modal() {
  return (
    <RouteModal size="wide">
      <NewRolePage />
    </RouteModal>
  );
}
