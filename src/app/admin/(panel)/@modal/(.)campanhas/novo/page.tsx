import RouteModal from "@/components/admin/RouteModal";
import NewCampaignPage from "@/app/admin/(panel)/campanhas/novo/page";

/** Aberto pela lista: mostra a mesma página dentro da janela central. */
export default function Modal() {
  return (
    <RouteModal>
      <NewCampaignPage />
    </RouteModal>
  );
}
