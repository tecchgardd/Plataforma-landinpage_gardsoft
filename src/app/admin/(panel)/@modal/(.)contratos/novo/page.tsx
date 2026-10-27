import RouteModal from "@/components/admin/RouteModal";
import NewContractPage from "@/app/admin/(panel)/contratos/novo/page";

/** Aberto pela lista: mostra a mesma página dentro da janela central. */
export default function Modal(props: Parameters<typeof NewContractPage>[0]) {
  return (
    <RouteModal size="wide">
      <NewContractPage {...props} />
    </RouteModal>
  );
}
