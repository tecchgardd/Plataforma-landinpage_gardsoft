import Link from "next/link";
import PageHeader, { Empty } from "@/components/admin/PageHeader";
import Avatar from "@/components/admin/Avatar";
import { prisma, type Prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Histórico" };

const PAGE = 50;

const entities = [
  { value: "lead", label: "Leads" },
  { value: "cliente", label: "Clientes" },
  { value: "projeto", label: "Projetos" },
  { value: "campanha", label: "Campanhas" },
  { value: "conteudo", label: "Conteúdo do site" },
  { value: "usuario", label: "Usuários" },
  { value: "perfil", label: "Perfil" },
];

const actionIcon: Record<string, string> = {
  criou: "＋",
  editou: "✎",
  excluiu: "🗑",
  moveu: "⇄",
  converteu: "🤝",
  repescou: "↺",
  anexou: "📎",
  comentou: "💬",
  concluiu: "✓",
  publicou: "🌐",
};

function entityHref(entity: string, id: string | null) {
  if (!id) return null;
  switch (entity) {
    case "lead":
      return `/admin/leads/${id}`;
    case "cliente":
      return `/admin/clientes/${id}`;
    case "projeto":
      return `/admin/projetos?projeto=${id}`;
    case "campanha":
      return `/admin/campanhas/${id}`;
    case "usuario":
      return `/admin/usuarios/${id}`;
    case "conteudo":
      return `/admin/conteudo/${id}`;
    default:
      return null;
  }
}

const dayFmt = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long", timeZone: "America/Sao_Paulo" });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

/** "Editou o lead X" → "editou o lead X" (vem depois do nome de quem fez). */
const sentence = (summary: string) => summary.charAt(0).toLowerCase() + summary.slice(1);

type Search = { modulo?: string; usuario?: string; pagina?: string };

export default async function HistoryPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireUser();
  const params = await searchParams;
  const page = Math.max(1, Number(params.pagina) || 1);
  const where: Prisma.ActivityLogWhereInput = {};
  if (entities.some((e) => e.value === params.modulo)) where.entity = params.modulo;
  if (params.usuario) where.userId = params.usuario;

  const [logs, total, users] = await Promise.all([
    prisma.activityLog.findMany({
      where,
      include: { user: { select: { image: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE,
      take: PAGE,
    }),
    prisma.activityLog.count({ where }),
    prisma.user.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (p: number) => {
    const sp = new URLSearchParams();
    if (params.modulo) sp.set("modulo", params.modulo);
    if (params.usuario) sp.set("usuario", params.usuario);
    if (p > 1) sp.set("pagina", String(p));
    const s = sp.toString();
    return `/admin/historico${s ? `?${s}` : ""}`;
  };

  // Agrupa por dia para facilitar a leitura.
  const groups: { day: string; items: typeof logs }[] = [];
  for (const log of logs) {
    const day = dayFmt.format(log.createdAt);
    const last = groups.at(-1);
    if (last?.day === day) last.items.push(log);
    else groups.push({ day, items: [log] });
  }

  return (
    <>
      <PageHeader title="Histórico" subtitle="Tudo o que foi feito no portal: quem fez, o quê e quando." />
      <form className="adm-filters" method="get">
        <select name="modulo" defaultValue={params.modulo ?? ""} aria-label="Módulo">
          <option value="">Todos os módulos</option>
          {entities.map((e) => (
            <option key={e.value} value={e.value}>
              {e.label}
            </option>
          ))}
        </select>
        <select name="usuario" defaultValue={params.usuario ?? ""} aria-label="Colaborador">
          <option value="">Todos os colaboradores</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <button type="submit" className="adm-btn ghost">
          Filtrar
        </button>
      </form>

      {logs.length === 0 ? (
        <Empty title="Nenhuma ação registrada">As ações feitas no portal aparecem aqui.</Empty>
      ) : (
        <div className="adm-card">
          {groups.map((g) => (
            <section key={g.day} className="adm-log-day">
              <h2>{g.day}</h2>
              <ol className="adm-log">
                {g.items.map((log) => {
                  const link = entityHref(log.entity, log.entityId);
                  return (
                    <li key={log.id}>
                      <span className={`adm-log-icon act-${log.action}`} aria-hidden="true">
                        {actionIcon[log.action] ?? "•"}
                      </span>
                      <Avatar name={log.userName} image={log.user?.image} size={28} />
                      <div className="adm-log-text">
                        <p>
                          <strong>{log.userName}</strong> {link ? <Link href={link}>{sentence(log.summary)}</Link> : sentence(log.summary)}
                        </p>
                        <small>
                          {timeFmt.format(log.createdAt)} · {entities.find((e) => e.value === log.entity)?.label ?? log.entity} · {log.action}
                        </small>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {pages > 1 && (
            <nav className="adm-pager" aria-label="Páginas">
              {page > 1 ? <Link href={href(page - 1)}>← Mais recentes</Link> : <span />}
              <span>
                Página {page} de {pages}
              </span>
              {page < pages ? <Link href={href(page + 1)}>Mais antigas →</Link> : <span />}
            </nav>
          )}
        </div>
      )}
    </>
  );
}
