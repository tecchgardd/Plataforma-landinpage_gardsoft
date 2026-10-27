import RouteModal from "@/components/admin/RouteModal";
import NewExpensePage from "@/app/admin/(panel)/financeiro/despesas/nova/page";

/** Aberto pela lista: mostra a mesma página dentro da janela central. */
export default function Modal() {
  return (
    <RouteModal>
      <NewExpensePage />
    </RouteModal>
  );
}
