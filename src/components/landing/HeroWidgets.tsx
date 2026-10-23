"use client";

import { useEffect, useState } from "react";

/** Palavra que se escreve e se apaga em loop. */
export function RotatingWord({ words }: { words: string[] }) {
  const [index, setIndex] = useState(0);
  const [text, setText] = useState(words[0]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const word = words[index % words.length] ?? "";
    let delay = deleting ? 45 : 95;
    if (!deleting && text === word) delay = 1800;
    const timer = setTimeout(() => {
      if (!deleting && text === word) return setDeleting(true);
      if (deleting && text === "") {
        setDeleting(false);
        setIndex((i) => (i + 1) % words.length);
        return;
      }
      setText(deleting ? word.slice(0, text.length - 1) : word.slice(0, text.length + 1));
    }, delay);
    return () => clearTimeout(timer);
  }, [text, deleting, index, words]);

  return (
    <span className="rotating-word">
      <span className="gradient-text">{text}</span>
      <span className="caret" aria-hidden="true" />
    </span>
  );
}

const code = [
  [["k", "const "], ["v", "projeto"], ["p", " = "], ["k", "await "], ["f", "gardsoft"], ["p", "."], ["f", "criar"], ["p", "({"]],
  [["p", "  ideia: "], ["s", "\"sua ideia\""], ["p", ","]],
  [["p", "  design: "], ["s", "\"sob medida\""], ["p", ","]],
  [["p", "  mobile: "], ["k", "true"], ["p", ","]],
  [["p", "  objetivo: "], ["s", "\"crescer\""], ["p", ","]],
  [["p", "});"]],
  [["f", "deploy"], ["p", "(projeto); "], ["c", "// 🚀 no ar"]],
] as const;

const total = code.reduce((sum, line) => sum + line.reduce((s, [, t]) => s + t.length, 0), 0);

/** Editor de código que digita sozinho. */
export function CodeTyper() {
  const [chars, setChars] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setChars(total);
      return;
    }
    const timer = setTimeout(
      () => setChars((c) => (c >= total ? 0 : c + 1)),
      chars >= total ? 3200 : chars === 0 ? 700 : 32,
    );
    return () => clearTimeout(timer);
  }, [chars]);

  let left = chars;
  let cursorPlaced = false;
  return (
    <pre className="code-body" aria-label="Exemplo de código">
      {code.map((line, i) => {
        const tokens = line.map(([kind, t], j) => {
          const shown = t.slice(0, Math.max(0, left));
          left -= t.length;
          return shown ? (
            <span key={j} className={`t-${kind}`}>
              {shown}
            </span>
          ) : null;
        });
        const showCursor = !cursorPlaced && (left <= 0 || i === code.length - 1);
        if (showCursor) cursorPlaced = true;
        return (
          <div key={i} className="code-line">
            <span className="ln">{i + 1}</span>
            {tokens}
            {showCursor && <span className="code-cursor" aria-hidden="true" />}
          </div>
        );
      })}
    </pre>
  );
}
