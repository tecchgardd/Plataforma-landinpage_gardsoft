import { notFound } from "next/navigation";
import PageHeader from "@/components/admin/PageHeader";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/access";
import { getContent } from "@/lib/content";
import ContentEditor from "../ContentEditor";
import { sections } from "../specs";
import SectionSwitcher from "../SectionSwitcher";

export const metadata = { title: "Editar conteúdo" };

export default async function SectionPage({ params }: { params: Promise<{ secao: string }> }) {
  await requireAccess("conteudo", 1);
  const { secao } = await params;
  const section = sections.find((s) => s.key === secao);
  if (!section) notFound();
  const [row, value] = await Promise.all([
    prisma.content.findUnique({ where: { key: section.key }, select: { key: true } }),
    getContent(section.key),
  ]);

  return (
    <>
      <PageHeader
        title={section.title}
        subtitle={section.description}
        back={{ href: "/admin/conteudo", label: "Conteúdo do site" }}
        actions={<SectionSwitcher current={section.key} sections={sections.map((s) => ({ key: s.key, title: s.title }))} />}
      />
      <ContentEditor key={section.key} section={section} initial={value} customized={Boolean(row)} />
    </>
  );
}
