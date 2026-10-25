import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import ActionForm, { ConfirmButton } from "@/components/admin/ActionForm";
import ActionButton from "@/components/admin/ActionButton";
import { DocumentBadge } from "@/components/admin/Badges";
import { Input, Select, TextArea } from "@/components/admin/Fields";
import Files from "@/components/admin/Files";
import PageHeader from "@/components/admin/PageHeader";
import { prisma } from "@/lib/prisma";
import { getAccess, requireAccess } from "@/lib/access";
import { dateTime } from "@/lib/admin/format";
import { eventLabels, textBlocks, typeOf } from "@/lib/documents";
import { documentUrl, loadDocument } from "@/lib/documents-server";
import { emailConfigured } from "@/lib/integrations/email";
import {
  approveDocumentManually,
  cancelDocument,
  deleteDocument,
  deleteDocumentFile,
  newDocumentVersion,
  saveDocument,
  sendDocument,
  uploadDocumentFile,
} from "../../../_actions/documents";
import CopyLink from "../../contratos/CopyLink";
import SectionsEditor from "../SectionsEditor";

export const metadata = { title: "Documento" };

export default async function DocumentPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string }> }) {
  await requireAccess("documentos", 1);
  const access = (await getAccess())!;
  const [{ id }, { erro }] = await Promise.all([params, searchParams]);
  if (!z.uuid().safeParse(id).success) notFound();
  const [doc, events, projects, clients] = await Promise.all([
    loadDocument({ id }),
    prisma.documentEvent.findMany({ where: { documentId: id }, orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.project.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" } }),
    prisma.client.findMany({ select: { id: true, name: true, company: true, phone: true }, orderBy: { name: "asc" } }),
  ]);
  if (!doc) notFound();

  const kind = typeOf(doc.type);
  const canEdit = access.level("documentos") >= 2;
  const editable = canEdit && (doc.status === "rascunho" || doc.status === "ajustes");
  const sent = ["enviado", "visualizado", "aprovado", "ajustes"].includes(doc.status);
  const hints = Object.fromEntries(kind.sections.map((s) => [s.title, s.hint]));
  const lastAdjust = events.find((e) => e.kind === "ajustes");
  const phone = clients.find((c) => c.id === doc.clientId)?.phone;

  return (
    <>
      <PageHeader
        title={doc.title}
        subtitle={
          <>
            {doc.number} · {kind.short} · versão {doc.version} · <DocumentBadge status={doc.status} />
            {doc.project && (
              <>
                {" · "}
                <Link href={`/admin/projetos?projeto=${doc.project.id}`}>{doc.project.name}</Link>
              </>
            )}
          </>
        }
        back={{ href: "/admin/documentos", label: "Documentos" }}
        actions={
          <a href={`/api/documentos/${doc.id}/pdf`} target="_blank" rel="noopener noreferrer" className="adm-btn ghost">
            Ver PDF ↗
          </a>
        }
      />
      {erro === "aprovado" && <p className="adm-alert">Documentos aprovados não podem ser excluídos: eles são o registro do aceite.</p>}
      {doc.status === "ajustes" && lastAdjust && (
        <div className="adm-alert" role="status">
          <strong>O cliente pediu ajustes</strong> ({lastAdjust.actor}, {dateTime(lastAdjust.createdAt)}):
          <span className="adm-prewrap">“{lastAdjust.note}”</span>
          {editable && <span>Edite abaixo e salve: vira a versão {doc.version + 1}.</span>}
        </div>
      )}

      <div className="adm-detail">
        <div className="adm-modal-main">
          {doc.status === "aprovado" && (
            <section className="adm-card adm-signed">
              <h2>✓ Aprovado</h2>
              <p>
                Por <strong>{doc.approverName}</strong>
                {doc.approverEmail ? ` (${doc.approverEmail})` : ""} em {dateTime(doc.decidedAt)}
                {doc.approverIp ? ` · IP ${doc.approverIp}` : ""}
              </p>
              {doc.contentHash && <p className="adm-card-sub adm-mono">SHA-256: {doc.contentHash}</p>}
            </section>
          )}

          {editable ? (
            <section className="adm-card">
              <h2>Conteúdo</h2>
              <ActionForm action={saveDocument.bind(null, doc.id)} submitLabel={doc.status === "ajustes" ? `Salvar como versão ${doc.version + 1}` : "Salvar documento"}>
                <Input label="Título" name="title" defaultValue={doc.title} required wide />
                <Select label="Projeto" name="projectId" options={projects.map((p) => ({ value: p.id, label: p.name }))} defaultValue={doc.projectId} empty="Sem projeto" />
                <Select
                  label="Cliente"
                  name="clientId"
                  options={clients.map((c) => ({ value: c.id, label: c.company ? `${c.company} (${c.name})` : c.name }))}
                  defaultValue={doc.clientId}
                  empty="O do projeto"
                />
                <SectionsEditor initial={doc.sections} hints={hints} />
              </ActionForm>
            </section>
          ) : (
            <section className="adm-card adm-doc-read">
              <div className="adm-card-head">
                <h2>Conteúdo da versão {doc.version}</h2>
                {canEdit && doc.status !== "cancelado" && (
                  <ConfirmButton
                    action={newDocumentVersion.bind(null, doc.id)}
                    confirm={`Abrir a versão ${doc.version + 1} para editar? O link atual deixa de valer e o cliente precisará aprovar de novo.`}
                    className="adm-btn ghost small"
                  >
                    Editar (nova versão)
                  </ConfirmButton>
                )}
              </div>
              {doc.sections.map((s, i) => (
                <div key={i} className="adm-doc-section">
                  <h3>
                    {i + 1}. {s.title}
                  </h3>
                  {s.body.trim() ? (
                    textBlocks(s.body).map((b, j) =>
                      "list" in b ? (
                        <ul key={j}>
                          {b.list!.map((item, k) => (
                            <li key={k}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p key={j} className="adm-prewrap">
                          {b.text}
                        </p>
                      ),
                    )
                  ) : (
                    <p className="adm-card-sub">Não se aplica.</p>
                  )}
                </div>
              ))}
            </section>
          )}
        </div>

        <aside className="adm-side">
          {canEdit && doc.status !== "cancelado" && doc.status !== "aprovado" && (
            <section className="adm-card">
              <h2>Enviar para aprovação</h2>
              <p className="adm-card-sub">
                O cliente recebe um link para ler, aprovar ou pedir ajustes.
                {emailConfigured() ? " O PDF vai em anexo no e-mail." : " Configure o e-mail para enviar automaticamente."}
              </p>
              <ActionButton action={sendDocument.bind(null, doc.id)} pendingText="Enviando...">
                {sent ? "Reenviar" : "Enviar ao cliente"}
              </ActionButton>
              {sent && doc.status !== "ajustes" && (
                <CopyLink url={documentUrl(doc.token)} phone={phone} message={`Olá! Segue o documento ${doc.number} — ${doc.title} para sua aprovação:`} />
              )}
            </section>
          )}

          {canEdit && sent && doc.status !== "aprovado" && (
            <details className="adm-card">
              <summary>Registrar aprovação feita fora do link</summary>
              <ActionForm action={approveDocumentManually.bind(null, doc.id)} submitLabel="Registrar aprovação">
                <TextArea label="Como o cliente aprovou?" name="note" wide rows={2} placeholder="Ex.: Aprovado por e-mail em 20/10 (anexei o print)." />
              </ActionForm>
            </details>
          )}

          <section className="adm-card">
            <h2>Anexos</h2>
            <p className="adm-card-sub">Diagrama do MER, telas do layout, prints. Imagens PNG/JPG entram no PDF.</p>
            <Files
              type="documento"
              files={doc.files.map((f) => ({ ...f, createdAt: f.createdAt.toISOString() }))}
              upload={uploadDocumentFile.bind(null, doc.id)}
              remove={deleteDocumentFile}
              suggestions={["Diagrama do MER", "Layout — desktop", "Layout — celular", "Print da aprovação"]}
            />
          </section>

          <section className="adm-card">
            <h2>Linha do tempo</h2>
            <ol className="adm-timeline">
              {events.map((e) => (
                <li key={e.id} className={`ev-${e.kind}`}>
                  <strong>
                    {eventLabels[e.kind] ?? e.kind} <span className="adm-sub-inline">v{e.version}</span>
                  </strong>
                  <small>
                    {e.actor ? `${e.actor} · ` : ""}
                    {dateTime(e.createdAt)}
                  </small>
                  {e.note && <p className="adm-prewrap">{e.note}</p>}
                </li>
              ))}
            </ol>
          </section>

          {canEdit && doc.status !== "cancelado" && doc.status !== "aprovado" && (
            <ConfirmButton action={cancelDocument.bind(null, doc.id)} confirm="Cancelar este documento? O link para o cliente deixa de funcionar." className="adm-btn ghost">
              Cancelar documento
            </ConfirmButton>
          )}
          {access.level("documentos") >= 3 && doc.status !== "aprovado" && (
            <ConfirmButton action={deleteDocument.bind(null, doc.id)} confirm="Excluir este documento definitivamente?" className="adm-btn danger ghost">
              Excluir
            </ConfirmButton>
          )}
        </aside>
      </div>
    </>
  );
}
