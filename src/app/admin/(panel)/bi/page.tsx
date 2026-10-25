import Link from "next/link";
import ActionForm from "@/components/admin/ActionForm";
import ActionButton from "@/components/admin/ActionButton";
import PageHeader from "@/components/admin/PageHeader";
import { prisma } from "@/lib/prisma";
import { getAccess, requireAccess } from "@/lib/access";
import { money, moneyInput } from "@/lib/admin/format";
import { goalMetrics, periods, type GoalMetric } from "@/lib/bi";
import { labelOf, leadSources } from "@/lib/admin/options";
import { biData, goalHistory } from "@/lib/bi-data";
import { copyPreviousGoals, saveBiSettings, saveGoals } from "../../_actions/goals";
import { Breakdown, CashChart, LeadsMonthChart } from "./Charts";

export const metadata = { title: "BI e metas" };


const pct = (v: number) => `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

/** Variação contra o período anterior, com seta + texto (nunca só cor). */
function Delta({ now, before }: { now: number; before: number }) {
  if (!before) return <small>Sem base no período anterior</small>;
  const change = ((now - before) / before) * 100;
  const up = change >= 0;
  return (
    <small className={up ? "up" : "down"}>
      {up ? "▲" : "▼"} {pct(Math.abs(change))} vs período anterior
    </small>
  );
}

function formatMetric(metric: GoalMetric, value: number) {
  const unit = goalMetrics.find((m) => m.key === metric)!.unit;
  return unit === "money" ? money(value) : unit === "percent" ? pct(value / 100) : value.toLocaleString("pt-BR");
}

export default async function BiPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  await requireAccess("bi", 1);
  const access = (await getAccess())!;
  const canEdit = access.level("bi") >= 2;
  const { periodo } = await searchParams;
  const period = periods.find((p) => p.value === periodo)?.value ?? "12";
  const data = await biData(Number(period));
  const [history, settings] = await Promise.all([goalHistory(data.rows.slice(-6)), prisma.content.findUnique({ where: { key: "config:bi" } })]);
  const powerBiUrl = (settings?.value as { powerBiUrl?: string } | null)?.powerBiUrl ?? "";
  const { totals, prev, month } = data;
  const result = totals.received - totals.paid;
  const ticket = totals.projects ? Math.round(totals.sold / totals.projects) : 0;
  const conversion = totals.leads ? (totals.closedLeads / totals.leads) * 100 : 0;
  const monthLabel = new Date(`${month.key}-15T12:00:00Z`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
  const withGoal = goalMetrics.filter((m) => month.goal(m.key) !== null);

  return (
    <>
      <PageHeader
        title="BI e metas"
        subtitle="Crescimento da empresa, vendas por serviço, origem dos leads, retorno das campanhas e o mês contra a meta."
        actions={
          <nav className="adm-tabs adm-tabs-inline" aria-label="Período">
            {periods.map((p) => (
              <Link key={p.value} href={`/admin/bi?periodo=${p.value}`} className={period === p.value ? "active" : ""}>
                {p.label}
              </Link>
            ))}
          </nav>
        }
      />

      <section className="adm-lead-kpis" aria-label={`Resumo dos últimos ${period} meses`}>
        <div className="adm-kpi kpi-fechado">
          <span>Faturamento recebido</span>
          <strong>{money(totals.received)}</strong>
          <Delta now={totals.received} before={prev.received} />
        </div>
        <div className="adm-kpi kpi-total">
          <span>Vendas fechadas</span>
          <strong>{money(totals.sold)}</strong>
          <Delta now={totals.sold} before={prev.sold} />
        </div>
        <div className="adm-kpi kpi-contato">
          <span>Resultado (recebido − pago)</span>
          <strong className={result < 0 ? "neg" : ""}>{money(result)}</strong>
          <small>{totals.received ? `Margem de ${pct((result / totals.received) * 100)}` : "Sem recebimentos"}</small>
        </div>
        <div className="adm-kpi kpi-novo">
          <span>Ticket médio</span>
          <strong>{money(ticket)}</strong>
          <small>{totals.projects} projeto(s) vendido(s)</small>
        </div>
        <div className="adm-kpi kpi-perdido">
          <span>Conversão de leads</span>
          <strong>{pct(conversion)}</strong>
          <small>
            {totals.closedLeads} de {totals.leads} leads · {totals.clients} cliente(s) novo(s)
          </small>
        </div>
      </section>

      <section className="adm-card">
        <div className="adm-card-head">
          <div>
            <h2>Metas de {monthLabel}</h2>
            <p className="adm-card-sub">
              Dia {month.elapsed} de {month.daysInMonth}. A projeção mantém o ritmo dos dias que já passaram.
            </p>
          </div>
          {canEdit && (
            <ActionButton action={copyPreviousGoals.bind(null, month.key)} className="adm-btn ghost small" pendingText="Copiando...">
              Copiar metas do mês anterior
            </ActionButton>
          )}
        </div>
        {withGoal.length === 0 ? (
          <p className="adm-card-sub">Nenhuma meta definida para este mês{canEdit ? " — defina abaixo." : "."}</p>
        ) : (
          <div className="adm-goals">
            {withGoal.map((m) => {
              const target = month.goal(m.key)!;
              const actual = month.actual[m.key];
              // Conversão é taxa: não se projeta pelo ritmo, compara direto.
              const projected = m.unit === "percent" ? actual : Math.round((actual / Math.max(1, month.elapsed)) * month.daysInMonth);
              const done = actual >= target;
              const onTrack = projected >= target;
              const status = done ? { icon: "✓", label: "Meta batida", cls: "ok" } : onTrack ? { icon: "↗", label: "No ritmo", cls: "track" } : { icon: "!", label: "Abaixo do ritmo", cls: "behind" };
              return (
                <div key={m.key} className={`adm-goal ${status.cls}`}>
                  <span className="adm-goal-head">
                    <b>{m.label}</b>
                    <span className="adm-goal-status">
                      <span aria-hidden="true">{status.icon}</span> {status.label}
                    </span>
                  </span>
                  <strong>{formatMetric(m.key, actual)}</strong>
                  <span className="adm-bar-track" title={`${Math.round((actual / target) * 100)}% da meta`}>
                    <span className="adm-bar" style={{ width: `${Math.min(100, (actual / target) * 100)}%` }} />
                  </span>
                  <small>
                    Meta {formatMetric(m.key, target)} · {Math.round((actual / target) * 100)}%
                    {m.unit !== "percent" && !done && ` · projeção ${formatMetric(m.key, projected)}`}
                  </small>
                </div>
              );
            })}
          </div>
        )}
        {canEdit && (
          <details className="adm-goal-edit">
            <summary>Definir metas de {monthLabel}</summary>
            <ActionForm action={saveGoals.bind(null, month.key)} submitLabel="Salvar metas">
              {goalMetrics.map((m) => {
                const target = month.goal(m.key);
                const value = target === null ? "" : m.unit === "money" ? moneyInput(target) : m.unit === "percent" ? String(target / 100) : String(target);
                return (
                  <label key={m.key} className="adm-field">
                    <span className="adm-label">
                      {m.label} {m.unit === "money" ? "(R$)" : m.unit === "percent" ? "(%)" : ""}
                    </span>
                    <input name={m.key} defaultValue={value} inputMode="decimal" placeholder="Sem meta" />
                    <small className="adm-hint">{m.hint}</small>
                  </label>
                );
              })}
            </ActionForm>
          </details>
        )}
      </section>

      <div className="adm-grid-chart">
        <section className="adm-card">
          <h2>Entradas e saídas por mês</h2>
          <p className="adm-card-sub">Valores efetivamente recebidos e pagos (financeiro).</p>
          <CashChart rows={data.rows} />
        </section>
        <section className="adm-card">
          <h2>Vendas por serviço</h2>
          <p className="adm-card-sub">Projetos vendidos nos últimos {period} meses.</p>
          <Breakdown rows={data.byService.map((s) => ({ label: s.label, value: s.cents, note: `${s.count}×` }))} format={money} empty="Nenhuma venda no período." />
        </section>
      </div>

      <div className="adm-grid-chart">
        <section className="adm-card">
          <h2>Leads por mês</h2>
          <p className="adm-card-sub">Passe o mouse para ver os fechados e a conversão de cada mês.</p>
          <LeadsMonthChart rows={data.rows} />
        </section>
        <section className="adm-card">
          <h2>De onde vêm os leads</h2>
          <p className="adm-card-sub">Origem dos contatos no período.</p>
          <Breakdown
            rows={data.bySource.map((s) => ({ label: labelOf(leadSources, s.label), value: s.leads, note: `${s.closed} fechado(s)` }))}
            format={(v) => `${v} lead${v === 1 ? "" : "s"}`}
            empty="Nenhum lead no período."
          />
        </section>
      </div>

      <section className="adm-card flush">
        <div className="adm-card-head adm-card-pad">
          <div>
            <h2>Retorno das campanhas</h2>
            <p className="adm-card-sub">Investimento, custo por lead e vendas geradas pelos leads de cada campanha (últimos {period} meses).</p>
          </div>
          <Link href="/admin/campanhas">Campanhas →</Link>
        </div>
        {data.campaigns.length === 0 ? (
          <p className="adm-card-sub adm-card-pad">Nenhuma campanha com leads ou investimento no período.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Campanha</th>
                  <th className="num">Investimento</th>
                  <th className="num">Leads</th>
                  <th className="num">Custo por lead</th>
                  <th className="num">Fechados</th>
                  <th className="num">Vendas geradas</th>
                  <th className="num">Retorno (ROI)</th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/admin/campanhas/${c.id}`} className="adm-row-link">
                        <strong>{c.name}</strong>
                        <small>{c.channels.join(", ") || c.status}</small>
                      </Link>
                    </td>
                    <td className="num">{money(c.budget)}</td>
                    <td className="num">{c.leads}</td>
                    <td className="num">{c.cpl === null ? "—" : money(c.cpl)}</td>
                    <td className="num">
                      {c.closed}
                      {c.leads > 0 && <small className="adm-sub">{pct((c.closed / c.leads) * 100)}</small>}
                    </td>
                    <td className="num">{money(c.revenue)}</td>
                    <td className={`num ${c.roi !== null && c.roi < 0 ? "neg" : ""}`}>{c.roi === null ? "—" : `${c.roi >= 0 ? "▲" : "▼"} ${pct(c.roi * 100)}`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="adm-card flush">
        <div className="adm-card-head adm-card-pad">
          <div>
            <h2>Planejado × realizado</h2>
            <p className="adm-card-sub">Últimos 6 meses. Embaixo de cada valor, a meta do mês (quando definida).</p>
          </div>
        </div>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th>Mês</th>
                <th className="num">Faturamento</th>
                <th className="num">Vendas</th>
                <th className="num">Projetos</th>
                <th className="num">Leads</th>
                <th className="num">Clientes novos</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => {
                const cell = (metric: GoalMetric, actual: number) => {
                  const goal = h.goals[metric];
                  return (
                    <td className="num">
                      {formatMetric(metric, actual)}
                      {goal ? (
                        <small className={`adm-sub ${actual >= goal ? "hit" : ""}`}>
                          meta {formatMetric(metric, goal)} · {Math.round((actual / goal) * 100)}%{actual >= goal ? " ✓" : ""}
                        </small>
                      ) : null}
                    </td>
                  );
                };
                return (
                  <tr key={h.key}>
                    <td>{h.label}</td>
                    {cell("faturamento", h.received)}
                    {cell("vendas", h.sold)}
                    {cell("projetos", h.projects)}
                    {cell("leads", h.leads)}
                    {cell("clientes", h.clients)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="adm-card">
        <div className="adm-card-head">
          <div>
            <h2>Power BI</h2>
            <p className="adm-card-sub">Relatórios montados no Power BI da Microsoft, ligados ao mesmo banco de dados, aparecem aqui.</p>
          </div>
        </div>
        {powerBiUrl ? (
          <div className="adm-embed">
            <iframe title="Relatório do Power BI" src={powerBiUrl} allowFullScreen loading="lazy" />
          </div>
        ) : (
          <p className="adm-card-sub">Nenhum relatório conectado.</p>
        )}
        {canEdit && (
          <details className="adm-goal-edit">
            <summary>{powerBiUrl ? "Trocar o relatório" : "Conectar um relatório"}</summary>
            <ActionForm action={saveBiSettings} submitLabel="Salvar">
              <label className="adm-field wide">
                <span className="adm-label">Link de incorporação</span>
                <input name="powerBiUrl" type="url" defaultValue={powerBiUrl} placeholder="https://app.powerbi.com/reportEmbed?reportId=..." />
                <small className="adm-hint">No Power BI: Arquivo → Inserir relatório → Site ou portal. Deixe em branco para remover.</small>
              </label>
            </ActionForm>
          </details>
        )}
      </section>
    </>
  );
}
