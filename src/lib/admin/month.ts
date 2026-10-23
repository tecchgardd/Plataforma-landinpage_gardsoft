/** Mês de referência dos relatórios, no fuso de Brasília (UTC−3, sem horário de verão). */
export type Month = {
  key: string; // "2026-10"
  label: string; // "outubro de 2026"
  start: Date;
  end: Date;
  days: number;
  prev: string;
  next: string | null; // null quando é o mês atual
};

const OFFSET = "-03:00";
const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

function keyOf(year: number, month: number) {
  const d = new Date(Date.UTC(year, month, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Mês atual em Brasília, como "2026-10". */
export function currentMonthKey() {
  return new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 7);
}

/** Lê "?mes=2026-10" (inválido ou futuro → mês atual). */
export function parseMonth(param?: string | null): Month {
  const current = currentMonthKey();
  const key = param && /^\d{4}-(0[1-9]|1[0-2])$/.test(param) && param <= current ? param : current;
  const [year, month] = key.split("-").map(Number);
  const nextKey = keyOf(year, month);
  return {
    key,
    label: monthName.format(new Date(Date.UTC(year, month - 1, 1))),
    start: new Date(`${key}-01T00:00:00${OFFSET}`),
    end: new Date(`${nextKey}-01T00:00:00${OFFSET}`),
    days: new Date(Date.UTC(year, month, 0)).getUTCDate(),
    prev: keyOf(year, month - 2),
    next: key === current ? null : nextKey,
  };
}

/** Dia do mês (1–31) de uma data, no fuso de Brasília. */
export function dayInBrazil(date: Date) {
  return new Date(date.getTime() - 3 * 3600e3).getUTCDate();
}
