import Link from "next/link";
import { QuoteBadge } from "@/components/admin/Badges";
import { shortDate } from "@/lib/admin/format";

/** Campos do orçamento usados na lista de documentos vinculados (lead, cliente, projeto, financeiro). */
export const quoteListSelect = { id: true, number: true, title: true, status: true, validUntil: true, createdAt: true } as const;

type Item = { id: string; number: string; title: string; status: string; validUntil: Date | null; createdAt: Date };

/**
 * Orçamentos vinculados ao registro. Os valores ficam só no documento do orçamento:
 * aqui aparece o número, o título e a situação, com link para abrir o documento.
 */
export default function QuoteList({ quotes, empty }: { quotes: Item[]; empty?: string }) {
  if (quotes.length === 0) return empty ? <p className="adm-card-sub">{empty}</p> : null;
  return (
    <ul className="adm-list compact">
      {quotes.map((q) => (
        <li key={q.id}>
          <Link href={`/admin/orcamentos/${q.id}`}>
            <span>
              <strong>{q.title}</strong>
              <small>
                <span className="adm-mono">{q.number}</span> · {shortDate(q.createdAt)}
              </small>
            </span>
            <QuoteBadge status={q.status} validUntil={q.validUntil} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
