import Link from "next/link";
import PageHeader from "@/components/admin/PageHeader";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/access";
import { dateTime } from "@/lib/admin/format";
import { sections } from "./specs";

export const metadata = { title: "Conteúdo do site" };

export default async function ContentPage() {
  await requireAccess("conteudo", 1);
  const rows = await prisma.content.findMany({ select: { key: true, updatedAt: true } });
  const updated = Object.fromEntries(rows.map((r) => [r.key, r.updatedAt]));

  return (
    <>
      <PageHeader
        title="Conteúdo do site"
        subtitle="As seções estão na ordem em que aparecem na landing page. As alterações vão ao ar assim que você salva."
        actions={
          <a href="/" target="_blank" rel="noopener noreferrer" className="adm-btn ghost">
            Ver site ↗
          </a>
        }
      />
      <div className="adm-sections">
        {sections.map((s, i) => (
          <Link key={s.key} href={`/admin/conteudo/${s.key}`} className="adm-card adm-section-card">
            <span className="adm-section-num">{String(i + 1).padStart(2, "0")}</span>
            <h2>{s.title}</h2>
            <p className="adm-card-sub">{s.description}</p>
            <small className={updated[s.key] ? "edited" : ""}>
              {updated[s.key] ? `Editado em ${dateTime(updated[s.key])}` : "Usando o texto padrão"}
            </small>
          </Link>
        ))}
      </div>
    </>
  );
}
