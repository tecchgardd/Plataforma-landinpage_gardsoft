import RouteModal from "@/components/admin/RouteModal";
import QuotePage from "@/app/admin/(panel)/orcamentos/[id]/page";

/** Aberto pela lista (clique na linha ou no menu "⋯"): mostra a ficha dentro da janela central. */
export default async function Modal(props: Parameters<typeof QuotePage>[0]) {
  const { id } = await props.params;
  return (
    <RouteModal key={id} size="wide">
      <QuotePage {...props} />
    </RouteModal>
  );
}
