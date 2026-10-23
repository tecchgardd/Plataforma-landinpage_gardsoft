"use client";

import { useActionState, useEffect, useRef, useState, type PointerEvent } from "react";
import { signContract, type SignState } from "../actions";

/** Formulário de assinatura com quadro para desenhar (mouse, caneta ou dedo). */
export default function SignForm({ token, defaults }: { token: string; defaults: { name: string; email: string; document: string } }) {
  const [state, action, pending] = useActionState(signContract.bind(null, token) as (s: SignState, f: FormData) => Promise<SignState>, {});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [signature, setSignature] = useState("");

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0a1430";
  }, []);

  useEffect(() => {
    if (state.signed) window.location.reload();
  }, [state.signed]);

  const point = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  function start(e: PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    drawing.current = true;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = point(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }
  function move(e: PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = e.currentTarget.getContext("2d")!;
    const p = point(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  }
  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    setSignature(canvasRef.current!.toDataURL("image/png"));
  }
  function clear() {
    const canvas = canvasRef.current!;
    canvas.getContext("2d")!.clearRect(0, 0, canvas.width, canvas.height);
    setSignature("");
  }

  return (
    <form action={action} className="sign-form">
      <div className="sign-grid">
        <label>
          Nome completo
          <input name="name" required defaultValue={defaults.name} autoComplete="name" />
        </label>
        <label>
          CPF ou CNPJ
          <input name="document" required defaultValue={defaults.document} inputMode="numeric" />
        </label>
        <label className="wide">
          E-mail para receber a via assinada
          <input name="email" type="email" required defaultValue={defaults.email} autoComplete="email" />
        </label>
      </div>

      <div className="sign-pad">
        <div className="sign-pad-head">
          <span>Desenhe sua assinatura</span>
          <button type="button" onClick={clear}>
            Limpar
          </button>
        </div>
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          aria-label="Quadro para desenhar a assinatura"
        />
        {!signature && <span className="sign-pad-hint">Use o mouse ou o dedo</span>}
      </div>
      <input type="hidden" name="signature" value={signature} />

      <label className="sign-accept">
        <input type="checkbox" name="accept" required />
        <span>Li o contrato na íntegra e concordo com todos os termos, escopo, valores e prazos. Reconheço a validade desta assinatura eletrônica.</span>
      </label>

      <button type="submit" className="sign-submit" disabled={pending || !signature}>
        {pending ? "Assinando..." : "Assinar contrato"}
      </button>
      {state.error && (
        <p role="alert" className="sign-error">
          {state.error}
        </p>
      )}
      <p className="sign-legal">Ao assinar, registramos data, hora, endereço IP e um código de verificação do documento.</p>
    </form>
  );
}
