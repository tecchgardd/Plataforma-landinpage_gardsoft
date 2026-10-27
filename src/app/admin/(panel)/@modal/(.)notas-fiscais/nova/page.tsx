import RouteModal from "@/components/admin/RouteModal";
import NewInvoicePage from "@/app/admin/(panel)/notas-fiscais/nova/page";

/** Aberto pela lista: mostra a mesma página dentro da janela central. */
export default function Modal(props: Parameters<typeof NewInvoicePage>[0]) {
  return (
    <RouteModal>
      <NewInvoicePage {...props} />
    </RouteModal>
  );
}
