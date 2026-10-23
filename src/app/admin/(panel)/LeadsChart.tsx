const monthShort = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** Escala "redonda" para o eixo: 4, 5, 10, 20, 50... */
function niceMax(value: number) {
  if (value <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow >= value) ?? 10;
  return step * pow;
}

/** Colunas de leads por dia do mês (série única). Dias futuros ficam vazios. */
export default function LeadsChart({ perDay, lastDay, monthKey }: { perDay: number[]; lastDay: number; monthKey: string }) {
  const max = niceMax(Math.max(...perDay));
  const ticks = [max, max / 2, 0];
  const mon = monthShort[Number(monthKey.slice(5, 7)) - 1];
  const label = (day: number) => `${day} ${mon}`;
  const showX = (day: number) => day === 1 || day % 5 === 0 || day === perDay.length;
  const peak = perDay.indexOf(Math.max(...perDay));
  const total = perDay.reduce((s, n) => s + n, 0);

  return (
    <figure className="adm-chart">
      <div className="adm-chart-plot" role="img" aria-label={`Leads por dia: ${total} no total, pico de ${perDay[peak]} em ${label(peak + 1)}.`}>
        <div className="adm-chart-grid" aria-hidden="true">
          {ticks.map((t) => (
            <span key={t}>
              <small>{Number.isInteger(t) ? t : t.toFixed(1)}</small>
            </span>
          ))}
        </div>
        <div className="adm-chart-cols">
          {perDay.map((n, i) => {
            const day = i + 1;
            const future = day > lastDay;
            return (
              <div
                key={day}
                className={`adm-chart-col ${future ? "future" : ""}`}
                tabIndex={future ? -1 : 0}
                data-tip={`${label(day)}: ${n} lead${n === 1 ? "" : "s"}`}
                aria-hidden="true"
              >
                {n > 0 && <span className="adm-chart-bar" style={{ height: `${(n / max) * 100}%` }} />}
              </div>
            );
          })}
        </div>
      </div>
      <div className="adm-chart-x" aria-hidden="true">
        {perDay.map((_, i) => (
          <span key={i}>{showX(i + 1) ? i + 1 : ""}</span>
        ))}
      </div>
      {/* Tabela não respeita height: 1px; o wrapper é que esconde. */}
      <div className="sr-only">
        <table>
          <caption>Leads por dia</caption>
          <tbody>
            {perDay.map((n, i) => (
              <tr key={i}>
                <th scope="row">{label(i + 1)}</th>
                <td>{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}
