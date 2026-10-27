import RouteModal from "@/components/admin/RouteModal";
import NewDocumentPage from "@/app/admin/(panel)/documentos/novo/page";

/** Aberto pela lista: mostra a mesma página dentro da janela central. */
export default function Modal(props: Parameters<typeof NewDocumentPage>[0]) {
  return (
    <RouteModal size="wide">
      <NewDocumentPage {...props} />
    </RouteModal>
  );
}
