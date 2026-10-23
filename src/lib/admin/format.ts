const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Sao_Paulo" });
const dateTimeFmt = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

export function money(cents: number | null | undefined) {
  return brl.format((cents ?? 0) / 100);
}

/** "1.500,50" | "1500.5" | "R$ 1.500" → centavos. */
export function parseMoney(input: string) {
  const cleaned = input.replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",") ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned;
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : 0;
}

/** Centavos → valor para o campo do formulário ("1500,50"). */
export function moneyInput(cents: number | null | undefined) {
  if (!cents) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function shortDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(`${value}T12:00:00`) : value;
  return dateFmt.format(date);
}

export function dateTime(value: Date | null | undefined) {
  return value ? dateTimeFmt.format(value) : "—";
}

export function phoneLink(phone: string | null | undefined) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return "";
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
}

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
