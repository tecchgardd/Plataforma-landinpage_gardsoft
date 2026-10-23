"use client";

import { useActionState, useEffect, useRef, useState, type RefObject } from "react";
import { submitLead, type LeadFormState } from "@/app/actions/lead";
import { whatsappLink } from "@/data/site";

type Props = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  service: string;
  setService: (service: string) => void;
  services: string[];
  whatsapp: string;
};

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;
type Utm = Record<(typeof UTM_KEYS)[number], string>;

/** Guarda a origem da visita (UTM) na sessão, para não perder ao navegar pela página. */
function readUtm(): Utm {
  const utm = { utm_source: "", utm_medium: "", utm_campaign: "" };
  try {
    const params = new URLSearchParams(window.location.search);
    const stored = JSON.parse(sessionStorage.getItem("gardsoft-utm") ?? "{}") as Partial<Utm>;
    for (const key of UTM_KEYS) utm[key] = params.get(key) ?? stored[key] ?? "";
    if (params.has("utm_source")) sessionStorage.setItem("gardsoft-utm", JSON.stringify(utm));
  } catch {
    /* sessionStorage indisponível */
  }
  return utm;
}

const initial: LeadFormState = { ok: false, message: "" };

export default function ContactDialog({ dialogRef, service, setService, services, whatsapp }: Props) {
  const [state, action, pending] = useActionState(submitLead, initial);
  const [utm, setUtm] = useState<Utm>({ utm_source: "", utm_medium: "", utm_campaign: "" });
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => setUtm(readUtm()), []);
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const waLink = state.ok && state.text ? whatsappLink(whatsapp, state.text) : "";
  const options = services.includes("Ainda quero entender as opções")
    ? services
    : [...services, "Ainda quero entender as opções"];

  return (
    <dialog
      id="contact-dialog"
      ref={dialogRef}
      aria-labelledby="contact-title"
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          event.currentTarget.close();
      }}
    >
      <button type="button" className="close" aria-label="Fechar" onClick={() => dialogRef.current?.close()}>
        ×
      </button>
      <span className="eyebrow">Vamos começar</span>
      <h2 id="contact-title">Qual é a sua ideia?</h2>

      {state.ok ? (
        <div id="message-result">
          <p className="success-box">{state.message}</p>
          {waLink && (
            <a className="btn btn-whatsapp" href={waLink} target="_blank" rel="noopener noreferrer">
              Adiantar a conversa no WhatsApp <span>↗</span>
            </a>
          )}
          <button type="button" className="btn btn-ghost" onClick={() => dialogRef.current?.close()}>
            Fechar
          </button>
        </div>
      ) : (
        <>
          <p>Conte o que você precisa. A gente retorna rapidinho com o melhor caminho.</p>
          <form id="brief-form" ref={formRef} action={action}>
            <label>
              Seu nome
              <input name="name" placeholder="Como podemos chamar você?" required maxLength={80} autoComplete="name" />
            </label>
            <div className="form-row">
              <label>
                WhatsApp
                <input
                  name="phone"
                  type="tel"
                  placeholder="(51) 99999-9999"
                  required
                  maxLength={30}
                  autoComplete="tel"
                />
              </label>
              <label>
                E-mail <small>(opcional)</small>
                <input name="email" type="email" placeholder="voce@empresa.com" maxLength={120} autoComplete="email" />
              </label>
            </div>
            <label>
              O que você procura?
              <select name="service" value={service} onChange={(event) => setService(event.target.value)}>
                {options.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
            <label>
              Conte um pouco sobre o projeto
              <textarea
                name="idea"
                placeholder="Meu negócio é... e eu gostaria de..."
                required
                maxLength={2000}
                rows={3}
              />
            </label>
            <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hp" aria-hidden="true" />
            {UTM_KEYS.map((key) => (
              <input key={key} type="hidden" name={key} value={utm[key]} />
            ))}
            <button className="btn" type="submit" disabled={pending}>
              {pending ? "Enviando..." : "Enviar minha ideia"} <span>↗</span>
            </button>
            {state.message && (
              <p role="alert" className="form-error">
                {state.message}
              </p>
            )}
          </form>
          <small className="preview-note">Seus dados são usados apenas para retornarmos o contato.</small>
        </>
      )}
    </dialog>
  );
}
