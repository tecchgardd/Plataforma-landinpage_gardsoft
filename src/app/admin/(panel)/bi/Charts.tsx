import { money } from "@/lib/admin/format";
import type { MonthRow } from "@/lib/bi-data";

/** Escala "redonda" para o eixo (1, 2, 2,5, 5 × 10ⁿ). */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= value) ?? 10;
  return step * pow;
}

/** R$ curto para o eixo: "R$ 12 mil", "R$ 1,5 mi". */
function compactMoney(cents: number) {
  const v = cents / 100;
  if (v >= 1e6) return `R$ ${(v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (v >= 1e3) return `R$ ${(v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`;
  return `R$ ${Math.round(v)}`;
}

/**
 * Entradas × saídas por mês: duas colunas por mês, mesma escala (sem eixo duplo).
 * Cores validadas (azul #1a5cff = entradas, laranja #c4560a = saídas); legenda com o total de cada série.
 */
export function CashChart({ rows }: { rows: MonthRow[] }) {
  const max = niceMax(Math.max(1, ...rows.flatMap((r) => [r.received, r.paid])));
  const ticks = [max, max / 2, 0];
  const totalIn = rows.reduce((s, r) => s + r.received, 0);
  const totalOut = rows.reduce((s, r) => s + r.paid, 0);
  const every = rows.length > 12 ? 3 : 1;
  return (
    <figure className="adm-chart adm-chart-money">
      <figcaption className="adm-legend">
        <span>
          <i className="sw sw-in" aria-hidden="true" /> Recebido <b>{money(totalIn)}</b>
        </span>
        <span>
          <i className="sw sw-out" aria-hidden="true" /> Pago <b>{money(totalOut)}</b>
        </span>
      </figcaption>
      <div className="adm-chart-plot" role="img" aria-label={`Entradas e saídas por mês. Recebido ${money(totalIn)}, pago ${money(totalOut)} no período.`}>
        <div className="adm-chart-grid" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t}>
              <small>{compactMoney(t)}</small>
            </span>
          ))}
        </div>
        <div className="adm-chart-cols">
          {rows.map((r) => (
            <div
              key={r.key}
              className="adm-chart-col adm-chart-pair"
              tabIndex={0}
              data-tip={`${r.label} · Recebido ${money(r.received)} · Pago ${money(r.paid)} · Resultado ${money(r.received - r.paid)}`}
              aria-hidden="true"
            >
              <span className="adm-chart-bar in" style={{ height: `${(r.received / max) * 100}%` }} />
              <span className="adm-chart-bar out" style={{ height: `${(r.paid / max) * 100}%` }} />
            </div>
          ))}
        </div>
      </div>
      <div className="adm-chart-x" aria-hidden="true">
        {rows.map((r, i) => (
          <span key={r.key}>{i % every === 0 || i === rows.length - 1 ? r.label : ""}</span>
        ))}
      </div>
    </figure>
  );
}

/** Leads por mês (série única); a dica mostra fechados e conversão. */
export function LeadsMonthChart({ rows }: { rows: MonthRow[] }) {
  const max = niceMax(Math.max(1, ...rows.map((r) => r.leads)));
  const ticks = [max, max / 2, 0];
  const every = rows.length > 12 ? 3 : 1;
  const total = rows.reduce((s, r) => s + r.leads, 0);
  return (
    <figure className="adm-chart">
      <div className="adm-chart-plot" role="img" aria-label={`Leads por mês: ${total} no período.`}>
        <div className="adm-chart-grid" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t}>
              <small>{Number.isInteger(t) ? t : t.toFixed(1)}</small>
            </span>
          ))}
        </div>
        <div className="adm-chart-cols">
          {rows.map((r) => (
            <div
              key={r.key}
              className="adm-chart-col"
              tabIndex={0}
              data-tip={`${r.label} · ${r.leads} lead${r.leads === 1 ? "" : "s"} · ${r.closedLeads} fechado${r.closedLeads === 1 ? "" : "s"}${r.leads ? ` (${Math.round((r.closedLeads / r.leads) * 100)}%)` : ""}`}
              aria-hidden="true"
            >
              {r.leads > 0 && <span className="adm-chart-bar" style={{ height: `${(r.leads / max) * 100}%` }} />}
            </div>
          ))}
        </div>
      </div>
      <div className="adm-chart-x" aria-hidden="true">
        {rows.map((r, i) => (
          <span key={r.key}>{i % every === 0 || i === rows.length - 1 ? r.label : ""}</span>
        ))}
      </div>
    </figure>
  );
}

/** Barras horizontais de série única (cor da marca), valores em texto. */
export function Breakdown({ rows, format, empty }: { rows: { label: string; value: number; note?: string }[]; format: (v: number) => string; empty: string }) {
  if (rows.length === 0) return <p className="adm-card-sub">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <ul className="adm-breakdown">
      {rows.map((r) => (
        <li key={r.label} title={`${r.label}: ${format(r.value)}`}>
          <span className="adm-breakdown-label">
            <b>{r.label}</b>
            <small>
              {r.note ? `${r.note} · ` : ""}
              {Math.round((r.value / Math.max(1, total)) * 100)}%
            </small>
          </span>
          <span className="adm-bar-track">
            <span className="adm-bar" style={{ width: `${(r.value / max) * 100}%` }} />
          </span>
          <strong>{format(r.value)}</strong>
        </li>
      ))}
    </ul>
  );
}
