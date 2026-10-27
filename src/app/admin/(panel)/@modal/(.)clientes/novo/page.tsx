import RouteModal from "@/components/admin/RouteModal";
import NewClientPage from "@/app/admin/(panel)/clientes/novo/page";

/** Aberto pela lista: mostra a mesma página dentro da janela central. */
export default function Modal() {
  return (
    <RouteModal>
      <NewClientPage />
    </RouteModal>
  );
}
