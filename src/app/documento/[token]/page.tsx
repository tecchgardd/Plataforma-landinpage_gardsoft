import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Logo from "@/components/brand/Logo";
import { prisma } from "@/lib/prisma";
import { logSystem } from "@/lib/activity";
import { textBlocks, typeOf } from "@/lib/documents";
import { loadDocument } from "@/lib/documents-server";
import DecisionForm from "./DecisionForm";
import "../../contrato/contrato.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Documento do projeto · Gardsoft", robots: { index: false, follow: false } };

const dateFmt = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

export default async function PublicDocumentPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) notFound();
  const doc = await loadDocument({ token });
  if (!doc || doc.status === "rascunho") notFound();

  // Primeira abertura do link: registra a leitura.
  if (doc.status === "enviado") {
    const opened = await prisma.projectDocument.updateMany({ where: { id: doc.id, status: "enviado" }, data: { status: "visualizado", viewedAt: new Date() } });
    if (opened.count) {
      await prisma.documentEvent.create({ data: { documentId: doc.id, kind: "visualizado", version: doc.version, actor: "Cliente" } });
      const who = doc.client ? (doc.client.company ?? doc.client.name) : "Cliente";
      await logSystem("visualizou", "documento", `Abriu o documento ${doc.number}`, doc.id, `${who} (cliente)`);
    }
  }

  const kind = typeOf(doc.type);
  const images = doc.files.filter((f) => f.mime.startsWith("image/"));
  const others = doc.files.filter((f) => !f.mime.startsWith("image/"));
  const fileUrl = (id: string) => `/documento/${token}/arquivo/${id}`;

  return (
    <div className="ct-page">
      <header className="ct-header">
        <Logo size={30} />
        <span>{kind.short}</span>
      </header>

      <main className="ct-main">
        <section className="ct-summary">
          <span className="ct-number">
            {doc.number} · versão {doc.version}
          </span>
          <h1>{doc.title}</h1>
          <dl>
            {doc.client && (
              <div>
                <dt>Cliente</dt>
                <dd>{doc.client.company ?? doc.client.name}</dd>
              </div>
            )}
            {doc.project && (
              <div>
                <dt>Projeto</dt>
                <dd>{doc.project.name}</dd>
              </div>
            )}
            <div>
              <dt>Documento</dt>
              <dd>{kind.label}</dd>
            </div>
          </dl>
        </section>

        {doc.status === "cancelado" ? (
          <section className="ct-card ct-center">
            <h2>Este documento foi cancelado</h2>
            <p>Fale com a Gardsoft para receber a versão atual.</p>
          </section>
        ) : (
          <>
            <section className="ct-card ct-doc">
              <div className="ct-doc-head">
                <h2>Leia o documento</h2>
                <a href={`/documento/${token}/pdf`} target="_blank" rel="noopener noreferrer">
                  Baixar PDF ↗
                </a>
              </div>
              {doc.sections.map((section, i) => (
                <div key={i} className="ct-section">
                  <h3>
                    {i + 1}. {section.title}
                  </h3>
                  {section.body.trim() ? (
                    textBlocks(section.body).map((block, j) =>
                      "list" in block ? (
                        <ul key={j}>
                          {block.list!.map((item, k) => (
                            <li key={k}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p key={j} className="ct-pre">
                          {block.text}
                        </p>
                      ),
                    )
                  ) : (
                    <p className="ct-muted">Não se aplica.</p>
                  )}
                </div>
              ))}
              {images.length > 0 && (
                <div className="ct-section">
                  <h3>Imagens</h3>
                  <div className="ct-figures">
                    {images.map((f) => (
                      <figure key={f.id}>
                        <a href={fileUrl(f.id)} target="_blank" rel="noopener noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={fileUrl(f.id)} alt={f.label ?? f.name} loading="lazy" />
                        </a>
                        <figcaption>{f.label ?? f.name}</figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              )}
              {others.length > 0 && (
                <div className="ct-section">
                  <h3>Arquivos</h3>
                  <ul>
                    {others.map((f) => (
                      <li key={f.id}>
                        <a href={fileUrl(f.id)} target="_blank" rel="noopener noreferrer">
                          {f.label ?? f.name} ↗
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {doc.status === "aprovado" ? (
              <section className="ct-card ct-center ct-done">
                <span className="ct-check">✓</span>
                <h2>Documento aprovado</h2>
                <p>
                  Aprovado por <strong>{doc.approverName}</strong>
                  {doc.decidedAt ? ` em ${dateFmt(doc.decidedAt)}` : ""}.
                </p>
                <a className="ct-btn" href={`/documento/${token}/pdf?baixar`}>
                  Baixar PDF aprovado
                </a>
              </section>
            ) : doc.status === "ajustes" ? (
              <section className="ct-card ct-center">
                <h2>Ajustes solicitados</h2>
                <p>Recebemos o seu pedido. A Gardsoft vai enviar uma nova versão para você aprovar.</p>
              </section>
            ) : (
              <section className="ct-card">
                <h2>Sua decisão</h2>
                <DecisionForm token={token} defaults={{ name: doc.client?.name ?? "", email: doc.client?.email ?? "" }} />
              </section>
            )}
          </>
        )}
      </main>
      <footer className="ct-footer">Gardsoft · Tecnologia que impulsiona negócios</footer>
    </div>
  );
}
