import { redirect } from "next/navigation";

/** Os projetos abrem em modal sobre o quadro. Links antigos continuam funcionando. */
export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/admin/projetos?projeto=${encodeURIComponent(id)}`);
}
