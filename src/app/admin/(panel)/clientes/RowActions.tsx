"use client";

import { deleteClient } from "../../_actions/clients";
import { MenuAction, MenuAnchor, MenuLabel, MenuLink, MenuSeparator, RowMenu, menuIcons } from "@/components/admin/Dropdown";

type ClientRow = {
  id: string;
  label: string;
  email: string | null;
  whatsapp: string | null;
  quote: { id: string; number: string } | null;
};

/** Menu "⋯" da linha do cliente: ficha, documentos e atalhos para criar projeto, orçamento e contrato. */
export function ClientMenu({ client, level, can }: { client: ClientRow; level: number; can: { projects: boolean; quotes: boolean; contracts: boolean } }) {
  return (
    <RowMenu label={`Ações de ${client.label}`}>
      <MenuLabel>{client.label}</MenuLabel>
      <MenuLink href={`/admin/clientes/${client.id}`} icon={menuIcons.open}>
        Abrir cadastro
      </MenuLink>
      {client.quote && (
        <MenuLink href={`/admin/orcamentos/${client.quote.id}`} icon={menuIcons.doc}>
          Ver orçamento {client.quote.number}
        </MenuLink>
      )}
      {(can.projects || can.quotes || can.contracts) && <MenuSeparator />}
      {can.quotes && (
        <MenuLink href={`/admin/orcamentos/novo?cliente=${client.id}`} icon={menuIcons.plus}>
          Novo orçamento
        </MenuLink>
      )}
      {can.projects && (
        <MenuLink href={`/admin/projetos/novo?cliente=${client.id}`} icon={menuIcons.folder}>
          Novo projeto
        </MenuLink>
      )}
      {can.contracts && (
        <MenuLink href={`/admin/contratos/novo?cliente=${client.id}`} icon={menuIcons.contract}>
          Novo contrato
        </MenuLink>
      )}
      {(client.whatsapp || client.email) && <MenuSeparator />}
      {client.whatsapp && (
        <MenuAnchor href={client.whatsapp} icon={menuIcons.whatsapp}>
          WhatsApp
        </MenuAnchor>
      )}
      {client.email && (
        <MenuAnchor href={`mailto:${client.email}`} icon={menuIcons.mail}>
          Enviar e-mail
        </MenuAnchor>
      )}
      {level >= 3 && (
        <>
          <MenuSeparator />
          <MenuAction
            onSelect={() => deleteClient(client.id)}
            confirm={`Excluir ${client.label} e os documentos anexados? Os projetos continuam salvos, sem cliente vinculado.`}
            icon={menuIcons.trash}
            danger
          >
            Excluir cliente
          </MenuAction>
        </>
      )}
    </RowMenu>
  );
}
