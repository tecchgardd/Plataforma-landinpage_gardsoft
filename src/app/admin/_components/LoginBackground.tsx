"use client";

import { useEffect, useRef, useState } from "react";

/** Vídeo de fundo do login (dev codando). Coloque o arquivo em public/videos/; sem ele, fica a cena animada abaixo. */
const VIDEO = { webm: "/videos/login-bg.webm", mp4: "/videos/login-bg.mp4" };

/** Trecho de código: [texto, tipo de destaque]. "\n" quebra a linha. */
type Seg = [string, string?];
type Snippet = { file: string; code: Seg[] };

const snippets: Snippet[] = [
  {
    file: "app/admin/leads/page.tsx",
    code: [
      ["export default async function", "k"], [" LeadsPage", "f"], ["() {\n"],
      ["  const", "k"], [" leads = "], ["await", "k"], [" prisma.lead."], ["findMany", "f"], ["({\n"],
      ["    where", "p"], [": { status: { notIn: ["], ['"perdido"', "s"], ["] } },\n"],
      ["    orderBy", "p"], [": { createdAt: "], ['"desc"', "s"], [" },\n"],
      ["  });\n\n"],
      ["  return", "k"], [" (\n"],
      ["    <", ""], ["Table", "f"], [" rows", "p"], ["={leads} "], ["menu", "p"], ["={<"], ["RowMenu", "f"], [" />} />\n"],
      ["  );\n}\n"],
    ],
  },
  {
    file: "components/landing/Hero.tsx",
    code: [
      ["// landing nova da Gardsoft 🚀\n", "c"],
      ["export function", "k"], [" Hero", "f"], ["() {\n"],
      ["  return", "k"], [" (\n"],
      ["    <", ""], ["section", "t"], [" className", "p"], ["="], ['"hero"', "s"], [">\n"],
      ["      <", ""], ["h1", "t"], [">Tecnologia que impulsiona negócios</"], ["h1", "t"], [">\n"],
      ["      <", ""], ["Button", "f"], [" href", "p"], ["="], ['"/contato"', "s"], [">Fale com a gente</"], ["Button", "f"], [">\n"],
      ["    </", ""], ["section", "t"], [">\n"],
      ["  );\n}\n"],
    ],
  },
  {
    file: "lib/finance/quote.ts",
    code: [
      ["export const", "k"], [" quoteTotal", "f"], [" = (items: "], ["Item", "f"], ["[]) =>\n"],
      ["  items."], ["reduce", "f"], ["((sum, i) => sum + i.quantity * i.unitCents, "], ["0", "n"], [");\n\n"],
      ["export async function", "k"], [" approve", "f"], ["(id: "], ["string", "f"], [") {\n"],
      ["  await", "k"], [" prisma.quote."], ["update", "f"], ["({ where: { id }, data: { status: "], ['"aprovado"', "s"], [" } });\n"],
      ["  revalidatePath", "f"], ["("], ['"/admin"', "s"], [");\n}\n"],
    ],
  },
];

const terminal = [
  ["$ ", "npm run dev"],
  ["", "▲ Next.js 16 · Turbopack"],
  ["", "✓ Ready in 812ms"],
  ["", "○ Compiling /admin ..."],
  ["", "✓ Compiled in 241ms"],
  ["$ ", "git push origin main"],
  ["", "✓ Deploy da Gardsoft no ar"],
];

const lengthOf = (code: Seg[]) => code.reduce((n, [t]) => n + [...t].length, 0);

/** Recorta os n primeiros caracteres mantendo o destaque de cada trecho. */
function typed(code: Seg[], n: number) {
  const out: Seg[] = [];
  let left = n;
  for (const [text, kind] of code) {
    if (left <= 0) break;
    const chars = [...text];
    out.push([chars.slice(0, left).join(""), kind]);
    left -= chars.length;
  }
  return out;
}

/** Quantos trechos já digitados ficam acima do atual (a tela cheia precisa de texto até o topo). */
const HISTORY = 6;

/** Editor em tela cheia que digita sozinho: cada trecho terminado sobe e o próximo começa embaixo. */
function Editor() {
  // Sequência de trechos na tela; o último é o que está sendo digitado.
  const [order, setOrder] = useState(() => Array.from({ length: HISTORY }, (_, i) => i % snippets.length));
  const [count, setCount] = useState(0);
  const index = order[order.length - 1];
  const snippet = snippets[index];
  const total = lengthOf(snippet.code);

  useEffect(() => {
    // Terminou o trecho: pausa e começa o próximo embaixo.
    if (count >= total) {
      const t = setTimeout(() => {
        setOrder((o) => [...o.slice(-(HISTORY - 1)), (o[o.length - 1] + 1) % snippets.length]);
        setCount(0);
      }, 1400);
      return () => clearTimeout(t);
    }
    // Ritmo de quem digita: rápido, com pausas curtas no fim das linhas.
    const next = [...snippet.code.map(([t]) => t).join("")][count];
    const t = setTimeout(() => setCount((c) => c + 1), next === "\n" ? 180 : 24 + Math.random() * 46);
    return () => clearTimeout(t);
  }, [count, total, snippet]);

  const previous: Seg[] = order.slice(0, -1).flatMap((i) => [...snippets[i].code, ["\n"] as Seg]);
  const shown = [...previous, ...typed(snippet.code, count)];
  const lines = shown.map(([t]) => t).join("").split("\n").length;

  return (
    <div className="login-editor">
      <div className="login-editor-bar">
        <i />
        <i />
        <i />
        <span>{snippet.file}</span>
      </div>
      <div className="login-editor-body">
        <ol className="login-editor-gutter">
          {Array.from({ length: lines }, (_, i) => (
            <li key={i}>{i + 1}</li>
          ))}
        </ol>
        <pre>
          {shown.map(([text, kind], i) => (
            <span key={i} className={kind ? `c-${kind}` : undefined}>
              {text}
            </span>
          ))}
          <span className="login-caret" />
        </pre>
      </div>
    </div>
  );
}

/** Terminal que imprime as linhas uma a uma, em loop. */
function Terminal() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setCount((c) => (c >= terminal.length ? 0 : c + 1)), count >= terminal.length ? 4000 : 900);
    return () => clearTimeout(t);
  }, [count]);
  return (
    <div className="login-terminal">
      <div className="login-editor-bar">
        <i />
        <i />
        <i />
        <span>terminal — zsh</span>
      </div>
      <pre>
        {terminal.slice(0, count).map(([prompt, text], i) => (
          <span key={i} className={text.startsWith("✓") ? "ok" : undefined}>
            {prompt && <b>{prompt}</b>}
            {text}
            {"\n"}
          </span>
        ))}
        <span className="login-caret" />
      </pre>
    </div>
  );
}

export default function LoginBackground() {
  const [ready, setReady] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // O vídeo pode terminar de carregar antes da hidratação (o onLoadedData se perde).
    if ((ref.current?.readyState ?? 0) >= 2) setReady(true);
  }, []);

  return (
    <div className="login-bg" aria-hidden="true">
      <div className="login-glow g1" />
      <div className="login-glow g2" />
      <div className="login-scene">
        <Editor />
        <Terminal />
      </div>
      <video ref={ref} className={ready ? "ready" : ""} autoPlay muted loop playsInline preload="auto" onLoadedData={() => setReady(true)}>
        <source src={VIDEO.webm} type="video/webm" />
        <source src={VIDEO.mp4} type="video/mp4" />
      </video>
      <div className="login-bg-shade" />
    </div>
  );
}
