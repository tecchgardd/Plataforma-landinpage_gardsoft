import RouteModal from "@/components/admin/RouteModal";
import ClientPage from "@/app/admin/(panel)/clientes/[id]/page";

/** Aberto pela lista (clique na linha ou no menu "⋯"): mostra a ficha dentro da janela central. */
export default async function Modal(props: Parameters<typeof ClientPage>[0]) {
  const { id } = await props.params;
  return (
    <RouteModal key={id} size="wide">
      <ClientPage {...props} />
    </RouteModal>
  );
}
