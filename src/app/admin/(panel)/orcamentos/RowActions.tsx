"use client";

import { cancelQuote, convertQuoteToContract, deleteQuote, duplicateQuote } from "../../_actions/quotes";
import { MenuAction, MenuAnchor, MenuLabel, MenuLink, MenuSeparator, RowMenu, menuIcons } from "@/components/admin/Dropdown";

type QuoteRow = {
  id: string;
  number: string;
  status: string;
  /** Link público de aprovação (só depois de enviado). */
  link: string | null;
  contract: { id: string; number: string } | null;
};

/** Menu "⋯" da linha do orçamento: documento, PDF, link do cliente e próximos passos. */
export function QuoteMenu({ quote, level, canContract }: { quote: QuoteRow; level: number; canContract: boolean }) {
  const editable = !quote.contract && quote.status !== "cancelado";
  return (
    <RowMenu label={`Ações do orçamento ${quote.number}`}>
      <MenuLabel>{quote.number}</MenuLabel>
      <MenuLink href={`/admin/orcamentos/${quote.id}`} icon={menuIcons.open}>
        Abrir orçamento
      </MenuLink>
      <MenuAnchor href={`/api/orcamentos/${quote.id}/pdf`} icon={menuIcons.doc}>
        Ver PDF
      </MenuAnchor>
      <MenuAnchor href={`/api/orcamentos/${quote.id}/pdf?baixar`} icon={menuIcons.download} download>
        Baixar PDF
      </MenuAnchor>
      {quote.link && (
        <MenuAction onSelect={() => navigator.clipboard.writeText(quote.link!)} icon={menuIcons.copy}>
          Copiar link do cliente
        </MenuAction>
      )}
      {quote.contract && (
        <MenuLink href={`/admin/contratos/${quote.contract.id}`} icon={menuIcons.contract}>
          Ver contrato {quote.contract.number}
        </MenuLink>
      )}
      {level >= 2 && (
        <>
          <MenuSeparator />
          {canContract && quote.status === "aprovado" && !quote.contract && (
            <MenuAction onSelect={() => convertQuoteToContract(quote.id)} confirm="Gerar o contrato a partir deste orçamento?" icon={menuIcons.contract}>
              Gerar contrato
            </MenuAction>
          )}
          <MenuAction onSelect={() => duplicateQuote(quote.id)} confirm="Criar uma nova versão deste orçamento?" icon={menuIcons.copy}>
            Duplicar (nova versão)
          </MenuAction>
          {editable && (
            <MenuAction onSelect={() => cancelQuote(quote.id)} confirm={`Cancelar o orçamento ${quote.number}? O link do cliente deixa de valer.`} icon={menuIcons.cancel} danger>
              Cancelar orçamento
            </MenuAction>
          )}
        </>
      )}
      {level >= 3 && !quote.contract && (
        <MenuAction onSelect={() => deleteQuote(quote.id)} confirm={`Excluir o orçamento ${quote.number} definitivamente?`} icon={menuIcons.trash} danger>
          Excluir
        </MenuAction>
      )}
    </RowMenu>
  );
}
