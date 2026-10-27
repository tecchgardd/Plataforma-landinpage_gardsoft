import Link from "next/link";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import { QuoteBadge, TempBadge } from "@/components/admin/Badges";
import Avatar, { Owner } from "@/components/admin/Avatar";
import { prisma, type Prisma } from "@/lib/prisma";
import { getAccess, requireAccess } from "@/lib/access";
import { dateTime, phoneLink } from "@/lib/admin/format";
import { labelOf, leadGroups, leadSources, leadStatuses, temperatures } from "@/lib/admin/options";
import { parseMonth } from "@/lib/admin/month";
import { LeadMenu, RecoverButton, StatusSelect } from "./RowActions";

export const metadata = { title: "Leads" };

type Search = { q?: string; grupo?: string; status?: string; temperatura?: string; campanha?: string; mes?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAccess("leads", 1);
  const access = await getAccess();
  const level = access?.level("leads") ?? 0;
  const canQuote = (access?.level("orcamentos") ?? 0) >= 2;
  const params = await searchParams;

  // Filtros que valem para todas as abas (busca, temperatura, campanha, mês).
  const q = params.q?.trim();
  const base: Prisma.LeadWhereInput = {};
  if (q) {
    const like = { contains: q, mode: "insensitive" as const };
    base.OR = [{ name: like }, { email: like }, { phone: like }, { company: like }];
  }
  const temperature = temperatures.find((t) => t.value === params.temperatura)?.value;
  if (temperature) base.temperature = temperature;
  if (params.campanha && /^[0-9a-f-]{36}$/i.test(params.campanha)) base.campaignId = params.campanha;
  const month = params.mes ? parseMonth(params.mes) : null;
  if (month) base.createdAt = { gte: month.start, lt: month.end };

  // Aba (grupo de status) e, opcionalmente, um status específico.
  const group = leadGroups.find((g) => g.value === params.grupo);
  const status = leadStatuses.find((s) => s.value === params.status)?.value;
  const statusWhere = status ?? (group ? { in: [...group.statuses] } : undefined);

  const [rows, counts, campaignList] = await Promise.all([
    prisma.lead.findMany({
      where: statusWhere ? { ...base, status: statusWhere } : base,
      include: {
        campaign: { select: { name: true } },
        owner: { select: { name: true, image: true } },
        // Valores ficam só no documento do orçamento: na lista aparece o último orçamento vinculado.
        quotes: { select: { id: true, number: true, status: true, validUntil: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
      take: 300,
    }),
    prisma.lead.groupBy({ by: ["status"], where: base, _count: { _all: true } }),
    prisma.campaign.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const countOf = (statuses: readonly string[]) =>
    counts.filter((c) => statuses.includes(c.status)).reduce((s, c) => s + c._count._all, 0);
  const total = counts.reduce((s, c) => s + c._count._all, 0);

  const href = (changes: Partial<Search>) => {
    const next: Search = {
      q,
      temperatura: temperature,
      campanha: params.campanha,
      mes: month?.key,
      grupo: group?.value,
      status,
      ...changes,
    };
    const sp = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => Boolean(e[1])));
    const s = sp.toString();
    return `/admin/leads${s ? `?${s}` : ""}`;
  };
  const filtered = Boolean(q || temperature || params.campanha || month || status);

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Todos os contatos em um só lugar. Mude o status direto na lista e repesque quem esfriou."
        actions={
          <Link href="/admin/leads/novo" className="adm-btn">
            + Novo lead
          </Link>
        }
      />

      <nav className="adm-tabs" aria-label="Filtros rápidos">
        <Link href={href({ grupo: undefined, status: undefined })} className={!group && !status ? "active" : ""}>
          Todos <span>{total}</span>
        </Link>
        {leadGroups.map((g) => (
          <Link
            key={g.value}
            href={href({ grupo: g.value, status: undefined })}
            className={group?.value === g.value && !status ? "active" : ""}
          >
            {g.label} <span>{countOf(g.statuses)}</span>
          </Link>
        ))}
      </nav>

      <form className="adm-filters" method="get">
        {group && <input type="hidden" name="grupo" value={group.value} />}
        {month && <input type="hidden" name="mes" value={month.key} />}
        <input name="q" placeholder="Buscar por nome, e-mail, telefone ou empresa" defaultValue={q} />
        <select name="status" defaultValue={status ?? ""} aria-label="Status">
          <option value="">Todos os status</option>
          {leadStatuses.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select name="temperatura" defaultValue={temperature ?? ""} aria-label="Temperatura">
          <option value="">Todas as temperaturas</option>
          {temperatures.map((t) => (
            <option key={t.value} value={t.value}>
              {t.icon} {t.label}
            </option>
          ))}
        </select>
        <select name="campanha" defaultValue={params.campanha ?? ""} aria-label="Campanha">
          <option value="">Todas as campanhas</option>
          {campaignList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button type="submit" className="adm-btn ghost">
          Filtrar
        </button>
        {filtered && (
          <Link
            href={href({ q: undefined, temperatura: undefined, campanha: undefined, mes: undefined, status: undefined })}
            className="adm-btn ghost"
          >
            Limpar
          </Link>
        )}
      </form>

      {month && (
        <p className="adm-chip-row">
          Mostrando leads de <strong>{month.label}</strong>
          <Link href={href({ mes: undefined })} className="adm-chip">
            Ver todos os meses ×
          </Link>
        </p>
      )}

      {rows.length === 0 ? (
        <Empty title="Nenhum lead encontrado">Ajuste os filtros ou cadastre um lead manualmente.</Empty>
      ) : (
        <div className="adm-table-wrap adm-card flush">
          <table className="adm-table adm-leads-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th className="opt">Interesse</th>
                <th>Temperatura</th>
                <th>Status</th>
                <th className="opt">Origem</th>
                <th>Atendido por</th>
                <th>Orçamento</th>
                <th className="opt">Chegou em</th>
                <th>
                  <span className="sr-only">Ações</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => {
                const wa = phoneLink(lead.phone);
                const quote = lead.quotes[0] ?? null;
                return (
                  <tr key={lead.id} className={lead.status === "perdido" ? "is-muted" : ""}>
                    <td>
                      <div className="adm-row-main">
                        <Avatar name={lead.name} size={36} />
                        <Link href={`/admin/leads/${lead.id}`} className="adm-row-link">
                          <strong>{lead.name}</strong>
                          <small>{lead.company ?? lead.phone ?? lead.email ?? ""}</small>
                          {/* Em telas estreitas as colunas secundárias somem e o resumo aparece aqui. */}
                          <small className="adm-compact-only">
                            {[lead.service, labelOf(leadSources, lead.source), dateTime(lead.createdAt)].filter(Boolean).join(" · ")}
                          </small>
                        </Link>
                      </div>
                    </td>
                    <td className="opt">{lead.service ?? "—"}</td>
                    <td>
                      <TempBadge value={lead.temperature} />
                    </td>
                    <td>
                      <StatusSelect id={lead.id} value={lead.status} name={lead.name} disabled={level < 2} />
                    </td>
                    <td className="opt">
                      {labelOf(leadSources, lead.source)}
                      {lead.campaign && <small className="adm-sub">{lead.campaign.name}</small>}
                    </td>
                    <td>
                      <Owner user={lead.owner} />
                    </td>
                    <td>
                      {quote ? (
                        <Link href={`/admin/orcamentos/${quote.id}`} className="adm-doc-link" scroll={false}>
                          <span className="adm-mono">{quote.number}</span>
                          <QuoteBadge status={quote.status} validUntil={quote.validUntil} />
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="opt">{dateTime(lead.createdAt)}</td>
                    <td>
                      <div className="adm-row-actions">
                        {lead.status === "perdido" && level >= 2 && <RecoverButton id={lead.id} />}
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="adm-icon-btn wa"
                            aria-label={`WhatsApp de ${lead.name}`}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                              <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19zM9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.5-2-1-1 1c-1.2-.5-2.5-1.8-3-3l1-1-1-2z" />
                            </svg>
                          </a>
                        )}
                        <LeadMenu
                          lead={{ id: lead.id, name: lead.name, status: lead.status, email: lead.email, whatsapp: wa, clientId: lead.clientId, quote }}
                          level={level}
                          canQuote={canQuote}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
