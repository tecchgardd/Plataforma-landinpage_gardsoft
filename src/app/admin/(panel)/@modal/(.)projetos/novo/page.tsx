import RouteModal from "@/components/admin/RouteModal";
import NewProjectPage from "@/app/admin/(panel)/projetos/novo/page";

/** Aberto pela lista: mostra a mesma página dentro da janela central. */
export default function Modal(props: Parameters<typeof NewProjectPage>[0]) {
  return (
    <RouteModal>
      <NewProjectPage {...props} />
    </RouteModal>
  );
}
