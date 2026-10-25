/**
 * Perfis de acesso (estilo GLPI): para cada módulo, um nível.
 * 0 = sem acesso · 1 = ver · 2 = editar (criar e alterar) · 3 = excluir (acesso total).
 * Usado no servidor (páginas, ações, APIs) e no menu.
 */

export const levels = [
  { value: 0, label: "Sem acesso", short: "—" },
  { value: 1, label: "Ver", short: "Ver" },
  { value: 2, label: "Editar", short: "Editar" },
  { value: 3, label: "Excluir", short: "Total" },
] as const;

export type Level = 0 | 1 | 2 | 3;

export const modules = [
  { key: "dashboard", label: "Dashboard", group: "Geral", hint: "Resumo do mês. Os valores financeiros só aparecem para quem vê o Financeiro." },
  { key: "leads", label: "Leads", group: "Geral" },
  { key: "clientes", label: "Clientes", group: "Geral", hint: "Inclui os anexos do cliente." },
  { key: "projetos", label: "Projetos", group: "Geral", hint: "Quadro, checklist, atualizações e arquivos." },
  { key: "orcamentos", label: "Orçamentos", group: "Comercial" },
  { key: "contratos", label: "Contratos", group: "Comercial" },
  { key: "documentos", label: "Documentos do projeto", group: "Comercial", hint: "Termo de abertura, escopo, MER, aprovação de layout." },
  { key: "empresa", label: "Perfil da empresa e configuração do contrato", group: "Comercial" },
  { key: "financeiro", label: "Financeiro", group: "Financeiro", hint: "Cobranças, recebimentos, contas a pagar, despesas e integrações." },
  { key: "notas", label: "Notas fiscais", group: "Financeiro" },
  { key: "campanhas", label: "Campanhas e tráfego pago", group: "Marketing", hint: "Inclui as integrações com Meta e Google Ads." },
  { key: "bi", label: "BI e metas", group: "Marketing", hint: "Indicadores de crescimento e planejamento." },
  { key: "usuarios", label: "Usuários", group: "Administração" },
  { key: "perfis", label: "Perfis de acesso", group: "Administração" },
  { key: "conteudo", label: "Conteúdo do site", group: "Administração" },
  { key: "historico", label: "Histórico", group: "Administração", hint: "Quem fez o quê no portal." },
] as const;

export type ModuleKey = (typeof modules)[number]["key"];
export type Permissions = Partial<Record<ModuleKey, Level>>;

export const SUPER_ADMIN = "super_admin";

/** Permissões padrão dos perfis do sistema (o super admin tem tudo, sempre). */
export const defaultPermissions: Record<string, Permissions> = {
  gestor: {
    dashboard: 1,
    leads: 3,
    clientes: 3,
    projetos: 3,
    orcamentos: 3,
    contratos: 3,
    documentos: 3,
    empresa: 1,
    financeiro: 2,
    notas: 2,
    campanhas: 3,
    bi: 1,
    usuarios: 1,
    perfis: 0,
    conteudo: 2,
    historico: 1,
  },
  atendente: {
    dashboard: 1,
    leads: 2,
    clientes: 2,
    projetos: 2,
    orcamentos: 2,
    contratos: 1,
    documentos: 2,
    empresa: 0,
    financeiro: 0,
    notas: 0,
    campanhas: 1,
    bi: 0,
    usuarios: 0,
    perfis: 0,
    conteudo: 0,
    historico: 0,
  },
};

/** Nível do perfil em um módulo (valores inválidos viram "sem acesso"). */
export function levelOf(role: { key: string; permissions: unknown } | null | undefined, module: ModuleKey): Level {
  if (!role) return 0;
  if (role.key === SUPER_ADMIN) return 3;
  const value = (role.permissions as Permissions | null)?.[module];
  return value === 1 || value === 2 || value === 3 ? value : 0;
}

/** Todos os níveis do perfil, para o menu e para esconder botões. */
export function levelsOf(role: { key: string; permissions: unknown } | null | undefined) {
  return Object.fromEntries(modules.map((m) => [m.key, levelOf(role, m.key)])) as Record<ModuleKey, Level>;
}

/** Módulo dono de cada endereço do portal (o mais específico vence). */
const routes: [string, ModuleKey][] = [
  ["/admin/financeiro", "financeiro"],
  ["/admin/notas-fiscais", "notas"],
  ["/admin/contratos/configuracao", "empresa"],
  ["/admin/contratos", "contratos"],
  ["/admin/orcamentos", "orcamentos"],
  ["/admin/documentos", "documentos"],
  ["/admin/empresa", "empresa"],
  ["/admin/leads", "leads"],
  ["/admin/clientes", "clientes"],
  ["/admin/projetos", "projetos"],
  ["/admin/campanhas", "campanhas"],
  ["/admin/bi", "bi"],
  ["/admin/usuarios", "usuarios"],
  ["/admin/perfis", "perfis"],
  ["/admin/conteudo", "conteudo"],
  ["/admin/historico", "historico"],
];

export function moduleOfPath(pathname: string): ModuleKey | null {
  if (pathname === "/admin") return "dashboard";
  return routes.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1] ?? null;
}
