import "server-only";
import { Path, Svg } from "@react-pdf/renderer";

/** Identidade usada nos PDFs (contrato e orçamento). */
export const BLUE = "#1A5CFF";
export const INK = "#0A1430";
export const MUTED = "#6A7593";
export const LINE = "#E3E9F5";
export const SOFT = "#F5F8FF";

export function Shield({ size = 22, color = "#FFFFFF" }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size * 1.12} viewBox="0 0 100 112">
      <Path d="M86 28 50 12 14 28v28c0 23 15 39 36 47 21-8 36-24 36-47V46H47v10l13 7" stroke={color} strokeWidth={13} fill="none" />
    </Svg>
  );
}

export const fmtDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString("pt-BR");
export const fmtDateTime = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
