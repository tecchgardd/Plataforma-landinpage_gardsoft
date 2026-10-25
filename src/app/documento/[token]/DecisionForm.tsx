"use client";

import { useActionState, useEffect, useState } from "react";
import { decideDocument, type DecisionState } from "../actions";

/** Aprovar ou pedir ajustes (com comentário), com nome e e-mail de quem decide. */
export default function DecisionForm({ token, defaults }: { token: string; defaults: { name: string; email: string } }) {
  const [state, action, pending] = useActionState(decideDocument.bind(null, token) as (s: DecisionState, f: FormData) => Promise<DecisionState>, {});
  const [decision, setDecision] = useState<"aprovar" | "ajustes">("aprovar");

  useEffect(() => {
    if (state.done) window.location.reload();
  }, [state.done]);

  return (
    <form action={action} className="sign-form">
      <div className="ct-choice" role="radiogroup" aria-label="Decisão">
        <label className={decision === "aprovar" ? "on" : ""}>
          <input type="radio" name="decision" value="aprovar" checked={decision === "aprovar"} onChange={() => setDecision("aprovar")} />
          <strong>✓ Aprovar</strong>
          <small>Está tudo certo, pode seguir.</small>
        </label>
        <label className={decision === "ajustes" ? "on" : ""}>
          <input type="radio" name="decision" value="ajustes" checked={decision === "ajustes"} onChange={() => setDecision("ajustes")} />
          <strong>✎ Pedir ajustes</strong>
          <small>Quero mudar alguma coisa antes.</small>
        </label>
      </div>
      <div className="sign-grid">
        <label>
          Nome completo
          <input name="name" defaultValue={defaults.name} required autoComplete="name" />
        </label>
        <label>
          E-mail
          <input name="email" type="email" defaultValue={defaults.email} required autoComplete="email" />
        </label>
        <label className="wide">
          {decision === "ajustes" ? "O que precisa ser ajustado?" : "Comentário (opcional)"}
          <textarea name="note" rows={decision === "ajustes" ? 5 : 2} required={decision === "ajustes"} placeholder={decision === "ajustes" ? "Descreva cada ajuste: seção, o que mudar e como deve ficar." : ""} />
        </label>
      </div>
      {decision === "aprovar" && (
        <label className="sign-accept">
          <input type="checkbox" name="accept" />
          <span>Li o documento e aprovo o conteúdo desta versão. Sei que a aprovação fica registrada com data, hora e IP.</span>
        </label>
      )}
      {state.error && (
        <p className="sign-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="sign-submit" disabled={pending}>
        {pending ? "Enviando..." : decision === "aprovar" ? "Aprovar documento" : "Enviar pedido de ajustes"}
      </button>
    </form>
  );
}
