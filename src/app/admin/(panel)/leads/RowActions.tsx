"use client";

import { useOptimistic, useTransition } from "react";
import { convertLead, deleteLead, recoverLead, setLeadStatus } from "../../_actions/leads";
import { labelOf, leadStatuses } from "@/lib/admin/options";
import Dropdown, { MenuAction, MenuAnchor, MenuLabel, MenuLink, MenuSeparator, RowMenu, menuIcons } from "@/components/admin/Dropdown";

/** Status editável direto na lista: menu que abre para baixo, um aberto por vez. */
export function StatusSelect({ id, value, name, disabled }: { id: string; value: string; name: string; disabled?: boolean }) {
  const [current, setCurrent] = useOptimistic(value);
  const [pending, startTransition] = useTransition();
  return (
    <Dropdown
      label={`Status de ${name}: ${labelOf(leadStatuses, current)}`}
      align="start"
      buttonClass={`adm-status-pill status-${current}`}
      disabled={pending || disabled}
      button={
        <>
          <span>{labelOf(leadStatuses, current)}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </>
      }
    >
      {leadStatuses.map((s) => (
        <MenuAction
          key={s.value}
          icon={<span className={`adm-dot status-${s.value}`} aria-hidden="true" />}
          onSelect={() => {
            if (s.value === current) return;
            startTransition(async () => {
              setCurrent(s.value);
              await setLeadStatus(id, s.value);
            });
          }}
        >
          {s.label}
          {s.value === current && <span className="adm-dropdown-check">{menuIcons.check}</span>}
        </MenuAction>
      ))}
    </Dropdown>
  );
}

/** Repescagem: devolve um lead sem interesse para a fila de contato. */
export function RecoverButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="adm-row-btn"
      disabled={pending}
      title="Volta para Aguardando contato"
      onClick={() => startTransition(() => recoverLead(id))}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5" />
      </svg>
      {pending ? "Repescando…" : "Repescar"}
    </button>
  );
}

type LeadRow = {
  id: string;
  name: string;
  status: string;
  email: string | null;
  whatsapp: string | null;
  clientId: string | null;
  quote: { id: string; number: string } | null;
};

/** Menu "⋯" da linha: abre a ficha e os documentos na janela central e reúne as ações do lead. */
export function LeadMenu({ lead, level, canQuote }: { lead: LeadRow; level: number; canQuote: boolean }) {
  return (
    <RowMenu label={`Ações de ${lead.name}`}>
      <MenuLabel>{lead.name}</MenuLabel>
      <MenuLink href={`/admin/leads/${lead.id}`} icon={menuIcons.open}>
        Abrir ficha
      </MenuLink>
      {lead.quote && (
        <MenuLink href={`/admin/orcamentos/${lead.quote.id}`} icon={menuIcons.doc}>
          Ver orçamento {lead.quote.number}
        </MenuLink>
      )}
      {canQuote && (
        <MenuLink href={`/admin/orcamentos/novo?lead=${lead.id}`} icon={menuIcons.plus}>
          Novo orçamento
        </MenuLink>
      )}
      {lead.clientId && (
        <MenuLink href={`/admin/clientes/${lead.clientId}`} icon={menuIcons.folder}>
          Abrir cliente
        </MenuLink>
      )}
      {(lead.whatsapp || lead.email) && <MenuSeparator />}
      {lead.whatsapp && (
        <MenuAnchor href={lead.whatsapp} icon={menuIcons.whatsapp}>
          WhatsApp
        </MenuAnchor>
      )}
      {lead.email && (
        <MenuAnchor href={`mailto:${lead.email}`} icon={menuIcons.mail}>
          Enviar e-mail
        </MenuAnchor>
      )}
      {level >= 2 && (
        <>
          <MenuSeparator />
          {lead.status === "perdido" && (
            <MenuAction onSelect={() => recoverLead(lead.id)} icon={menuIcons.recover}>
              Repescar
            </MenuAction>
          )}
          <MenuAction onSelect={() => convertLead(lead.id)} confirm={`Criar cliente e projeto a partir de ${lead.name}?`} icon={menuIcons.check}>
            {lead.clientId ? "Criar novo projeto" : "Converter em cliente + projeto"}
          </MenuAction>
        </>
      )}
      {level >= 3 && (
        <MenuAction onSelect={() => deleteLead(lead.id)} confirm={`Excluir o lead ${lead.name} definitivamente?`} icon={menuIcons.trash} danger>
          Excluir lead
        </MenuAction>
      )}
    </RowMenu>
  );
}
