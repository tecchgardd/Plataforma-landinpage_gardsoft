"use client";

import { useActionState, useEffect, useState } from "react";
import { decideQuote, type DecisionState } from "../actions";

/** Aprovar ou recusar o orçamento pelo link público. */
export default function DecisionForm({ token, defaultName }: { token: string; defaultName: string }) {
  const [state, action, pending] = useActionState(decideQuote.bind(null, token) as (s: DecisionState, f: FormData) => Promise<DecisionState>, {});
  const [mode, setMode] = useState<"aprovado" | "recusado">("aprovado");

  useEffect(() => {
    if (state.done) window.location.reload();
  }, [state.done]);

  return (
    <form action={action} className="sign-form">
      <div className="q-choice" role="radiogroup" aria-label="Sua resposta">
        <label className={mode === "aprovado" ? "active" : ""}>
          <input type="radio" name="decision" value="aprovado" checked={mode === "aprovado"} onChange={() => setMode("aprovado")} />
          Aprovar orçamento
        </label>
        <label className={mode === "recusado" ? "active refuse" : ""}>
          <input type="radio" name="decision" value="recusado" checked={mode === "recusado"} onChange={() => setMode("recusado")} />
          Recusar
        </label>
      </div>
      <div className="sign-grid">
        <label className="wide">
          Seu nome
          <input name="name" required defaultValue={defaultName} autoComplete="name" />
        </label>
        <label className="wide">
          {mode === "aprovado" ? "Mensagem (opcional)" : "Pode contar o motivo? (opcional)"}
          <textarea name="note" rows={3} maxLength={1000} />
        </label>
      </div>
      {mode === "aprovado" && (
        <label className="sign-accept">
          <input type="checkbox" name="accept" required />
          <span>Li o orçamento e concordo com os serviços, valores, prazos e condições. Sei que o contrato será enviado em seguida para assinatura.</span>
        </label>
      )}
      <button type="submit" className={`sign-submit ${mode === "recusado" ? "q-refuse" : ""}`} disabled={pending}>
        {pending ? "Enviando..." : mode === "aprovado" ? "Aprovar orçamento" : "Recusar orçamento"}
      </button>
      {state.error && (
        <p role="alert" className="sign-error">
          {state.error}
        </p>
      )}
    </form>
  );
}
