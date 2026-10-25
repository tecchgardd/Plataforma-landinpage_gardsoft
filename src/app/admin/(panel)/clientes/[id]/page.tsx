import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import ActionForm, { ConfirmButton } from "@/components/admin/ActionForm";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import { StageBadge, StatusBadge } from "@/components/admin/Badges";
import { Owner } from "@/components/admin/Avatar";
import Files from "@/components/admin/Files";
import { prisma } from "@/lib/prisma";
import { getTeam } from "@/lib/activity";
import { requireAccess } from "@/lib/access";
import { money, phoneLink, shortDate } from "@/lib/admin/format";
import { deleteClient, deleteClientFile, saveClient, uploadClientFile } from "../../../_actions/clients";
import ClientFields from "../ClientFields";
import Can from "@/components/admin/Can";

export const metadata = { title: "Cliente" };

const fileSuggestions = [
  "Inscrição estadual",
  "Cartão CNPJ",
  "Contrato social",
  "Contrato de serviço",
  "Comprovante de endereço",
  "Documento do responsável",
];

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAccess("clientes", 1);
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const [client, team] = await Promise.all([
    prisma.client.findUnique({
      where: { id },
      include: {
        owner: { select: { name: true, image: true } },
        projects: { orderBy: { createdAt: "desc" } },
        leads: { orderBy: { createdAt: "desc" } },
        files: {
          select: { id: true, name: true, label: true, size: true, mime: true, createdAt: true },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    getTeam(),
  ]);
  if (!client) notFound();
  const wa = phoneLink(client.phone);
  const total = client.projects.reduce((s, p) => s + p.valueCents, 0);

  return (
    <>
      <PageHeader
        title={client.company ?? client.name}
        subtitle={
          <>
            {client.company ? `${client.name} · ` : ""}Cliente desde {shortDate(client.createdAt)} · <Owner user={client.owner} />
          </>
        }
        back={{ href: "/admin/clientes", label: "Clientes" }}
        actions={
          <>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="adm-btn whatsapp">
                WhatsApp
              </a>
            )}
            <Link href={`/admin/orcamentos/novo?cliente=${client.id}`} className="adm-btn ghost">
              + Orçamento
            </Link>
            <Link href={`/admin/contratos/novo?cliente=${client.id}`} className="adm-btn ghost">
              + Contrato
            </Link>
            <Link href={`/admin/projetos/novo?cliente=${client.id}`} className="adm-btn">
              + Novo projeto
            </Link>
          </>
        }
      />
      <div className="adm-detail">
        <div className="adm-card">
          <ActionForm action={saveClient.bind(null, client.id)} submitLabel="Salvar alterações">
            <ClientFields client={client} team={team} />
          </ActionForm>
        </div>
        <aside className="adm-side">
          <section className="adm-card">
            <h2>Documentos</h2>
            <p className="adm-card-sub">Inscrição estadual, cartão CNPJ, contratos e o que mais precisar para a nota fiscal.</p>
            <Files
              type="cliente"
              files={client.files.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }))}
              upload={uploadClientFile.bind(null, client.id)}
              remove={deleteClientFile}
              suggestions={fileSuggestions}
            />
          </section>
          <section className="adm-card">
            <div className="adm-card-head">
              <h2>Projetos</h2>
              <b>{money(total)}</b>
            </div>
            {client.projects.length === 0 ? (
              <Empty title="Nenhum projeto ainda" />
            ) : (
              <ul className="adm-list compact">
                {client.projects.map((p) => (
                  <li key={p.id}>
                    <Link href={`/admin/projetos?projeto=${p.id}`}>
                      <span>
                        <strong>{p.name}</strong>
                        <small>{money(p.valueCents)}</small>
                      </span>
                      <StageBadge value={p.stage} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {client.leads.length > 0 && (
            <section className="adm-card">
              <h2>Leads de origem</h2>
              <ul className="adm-list compact">
                {client.leads.map((l) => (
                  <li key={l.id}>
                    <Link href={`/admin/leads/${l.id}`}>
                      <span>
                        <strong>{l.service ?? "Lead"}</strong>
                        <small>{shortDate(l.createdAt)}</small>
                      </span>
                      <StatusBadge value={l.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <Can module="clientes" level={3}>
            <ConfirmButton
              action={deleteClient.bind(null, client.id)}
              confirm="Excluir este cliente e os documentos anexados? Os projetos continuam salvos, sem cliente vinculado."
              className="adm-btn danger ghost"
            >
              Excluir cliente
            </ConfirmButton>
          </Can>
        </aside>
      </div>
    </>
  );
}
