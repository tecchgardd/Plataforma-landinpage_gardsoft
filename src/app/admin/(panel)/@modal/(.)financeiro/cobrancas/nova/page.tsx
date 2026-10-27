import RouteModal from "@/components/admin/RouteModal";
import NewChargePage from "@/app/admin/(panel)/financeiro/cobrancas/nova/page";

/** Aberto pela lista: mostra a mesma página dentro da janela central. */
export default function Modal() {
  return (
    <RouteModal>
      <NewChargePage />
    </RouteModal>
  );
}
