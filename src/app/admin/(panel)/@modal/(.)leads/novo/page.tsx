import RouteModal from "@/components/admin/RouteModal";
import NewLeadPage from "@/app/admin/(panel)/leads/novo/page";

/** Aberto pela lista: mostra a mesma página dentro da janela central. */
export default function Modal() {
  return (
    <RouteModal>
      <NewLeadPage />
    </RouteModal>
  );
}
