import RouteModal from "@/components/admin/RouteModal";
import NewQuotePage from "@/app/admin/(panel)/orcamentos/novo/page";

/** Aberto pela lista: mostra a mesma página dentro da janela central. */
export default function Modal(props: Parameters<typeof NewQuotePage>[0]) {
  return (
    <RouteModal size="wide">
      <NewQuotePage {...props} />
    </RouteModal>
  );
}
