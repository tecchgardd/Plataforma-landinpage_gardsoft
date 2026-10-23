import Link from "next/link";
import { z } from "zod";
import PageHeader from "@/components/admin/PageHeader";
import ActionForm, { ConfirmButton } from "@/components/admin/ActionForm";
import Avatar from "@/components/admin/Avatar";
import { StageBadge, StatusBadge } from "@/components/admin/Badges";
import Files from "@/components/admin/Files";
import { fromDbDate, prisma } from "@/lib/prisma";
import { getTeam } from "@/lib/activity";
import { requireUser } from "@/lib/session";
import { money, shortDate } from "@/lib/admin/format";
import { projectStages } from "@/lib/admin/options";
import { deleteProject, deleteProjectFile, saveProject, uploadProjectFile } from "../../_actions/projects";
import Board, { type Card } from "./Board";
import ModalShell from "./ModalShell";
import ProjectFields from "./ProjectFields";
import { Checklist, Updates } from "./ProjectParts";

export const metadata = { title: "Projetos" };

const linkLabels = [
  { key: "githubUrl", label: "GitHub" },
  { key: "previewUrl", label: "Preview" },
  { key: "designUrl", label: "Design" },
  { key: "docsUrl", label: "Documentação" },
  { key: "url", label: "Site no ar" },
] as const;

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ projeto?: string }> }) {
  await requireUser();
  const { projeto } = await searchParams;
  const openId = projeto && z.uuid().safeParse(projeto).success ? projeto : null;
  const today = new Date().toISOString().slice(0, 10);

  const [projects, open, clients, team] = await Promise.all([
    prisma.project.findMany({
      include: {
        client: { select: { name: true, company: true } },
        owner: { select: { name: true, image: true } },
        tasks: { select: { done: true } },
        _count: { select: { files: true } },
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    }),
    openId
      ? prisma.project.findUnique({
          where: { id: openId },
          include: {
            client: { select: { id: true, name: true, company: true, phone: true } },
            lead: { select: { id: true, name: true, status: true } },
            owner: { select: { name: true, image: true } },
            tasks: { orderBy: [{ position: "asc" }, { createdAt: "asc" }] },
            updates: { orderBy: { createdAt: "desc" }, take: 100 },
            files: { select: { id: true, name: true, label: true, size: true, mime: true, createdAt: true }, orderBy: { createdAt: "desc" } },
          },
        })
      : null,
    openId ? prisma.client.findMany({ select: { id: true, name: true, company: true }, orderBy: { name: "asc" } }) : [],
    openId ? getTeam() : [],
  ]);

  const cards: Card[] = projects.map((p) => {
    const due = fromDbDate(p.dueDate);
    return {
      id: p.id,
      name: p.name,
      stage: p.stage,
      client: p.client ? (p.client.company ?? p.client.name) : null,
      owner: p.owner,
      value: p.valueCents ? money(p.valueCents) : null,
      due: due ? shortDate(due) : null,
      late: Boolean(due && due < today && p.stage !== "no_ar"),
      tasksDone: p.tasks.filter((t) => t.done).length,
      tasksTotal: p.tasks.length,
      files: p._count.files,
      github: p.githubUrl,
      preview: p.previewUrl,
    };
  });
  const pipeline = projects.filter((p) => p.stage !== "no_ar").reduce((s, p) => s + p.valueCents, 0);

  return (
    <>
      <PageHeader
        title="Projetos"
        subtitle={`Arraste os cards entre as etapas. Clique para abrir o projeto. ${money(pipeline)} em andamento.`}
        actions={
          <Link href="/admin/projetos/novo" className="adm-btn">
            + Novo projeto
          </Link>
        }
      />
      <Board columns={projectStages} cards={cards} />

      {open && (
        <ModalShell title={open.name}>
          <header className="adm-modal-head">
            <StageBadge value={open.stage} />
            <h2>{open.name}</h2>
            <div className="adm-modal-meta">
              {open.client && (
                <Link href={`/admin/clientes/${open.client.id}`}>🏢 {open.client.company ?? open.client.name}</Link>
              )}
              {open.lead && (
                <Link href={`/admin/leads/${open.lead.id}`}>
                  👤 Lead: {open.lead.name} <StatusBadge value={open.lead.status} />
                </Link>
              )}
              {open.owner && (
                <span className="adm-owner">
                  <Avatar name={open.owner.name} image={open.owner.image} size={22} /> {open.owner.name}
                </span>
              )}
              {open.valueCents > 0 && <span>💰 {money(open.valueCents)}</span>}
              {open.dueDate && <span>📅 Entrega {shortDate(fromDbDate(open.dueDate))}</span>}
            </div>
            <nav className="adm-modal-links" aria-label="Links do projeto">
              {linkLabels.map(({ key, label }) =>
                open[key] ? (
                  <a key={key} href={open[key]!} target="_blank" rel="noopener noreferrer" className="adm-btn ghost small">
                    {label} ↗
                  </a>
                ) : null,
              )}
            </nav>
          </header>

          <div className="adm-modal-body">
            <div className="adm-modal-main">
              {open.description && (
                <section>
                  <h3>Escopo</h3>
                  <p className="adm-prewrap">{open.description}</p>
                </section>
              )}
              <section>
                <h3>Checklist</h3>
                <Checklist projectId={open.id} tasks={open.tasks.map((t) => ({ id: t.id, title: t.title, done: t.done }))} />
              </section>
              <section>
                <h3>Atualizações</h3>
                <Updates
                  projectId={open.id}
                  notes={open.updates.map((n) => ({ id: n.id, text: n.text, author: n.author, kind: n.kind, createdAt: n.createdAt.toISOString() }))}
                />
              </section>
              <details className="adm-modal-edit">
                <summary>Editar detalhes, escopo e links</summary>
                <ActionForm action={saveProject.bind(null, open.id)} submitLabel="Salvar projeto">
                  <ProjectFields project={open} clients={clients} team={team} />
                </ActionForm>
              </details>
            </div>
            <aside className="adm-modal-side">
              <section>
                <h3>Documentação</h3>
                <Files
                  type="projeto"
                  files={open.files.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }))}
                  upload={uploadProjectFile.bind(null, open.id)}
                  remove={deleteProjectFile}
                  suggestions={["Briefing", "Contrato", "Layout aprovado", "Logo e identidade", "Textos do cliente", "Acessos"]}
                />
              </section>
              <ConfirmButton
                action={deleteProject.bind(null, open.id)}
                confirm="Excluir este projeto, o checklist, as atualizações e os anexos?"
                className="adm-btn danger ghost"
              >
                Excluir projeto
              </ConfirmButton>
            </aside>
          </div>
        </ModalShell>
      )}
    </>
  );
}
