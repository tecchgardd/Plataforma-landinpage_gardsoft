import {
  campaignStatuses,
  contractStatuses,
  invoiceStatuses,
  labelOf,
  leadStatuses,
  projectStages,
  quoteStatuses,
  temperatures,
} from "@/lib/admin/options";

/** Temperatura sempre com ícone + texto (nunca só cor). */
export function TempBadge({ value }: { value: string }) {
  const t = temperatures.find((x) => x.value === value);
  return (
    <span className={`adm-badge temp-${value}`}>
      <span aria-hidden="true">{t?.icon}</span> {t?.label ?? value}
    </span>
  );
}

export function StatusBadge({ value }: { value: string }) {
  return <span className={`adm-badge status-${value}`}>{labelOf(leadStatuses, value)}</span>;
}

export function StageBadge({ value }: { value: string }) {
  const index = projectStages.findIndex((s) => s.value === value);
  return (
    <span className={`adm-badge stage ${value === "no_ar" ? "status-fechado" : ""}`}>
      {index + 1}/{projectStages.length} · {labelOf(projectStages, value)}
    </span>
  );
}

export function CampaignBadge({ value }: { value: string }) {
  return <span className={`adm-badge camp-${value}`}>{labelOf(campaignStatuses, value)}</span>;
}

export function ContractBadge({ status }: { status: string }) {
  return <span className={`adm-badge ct-${status}`}>{labelOf(contractStatuses, status)}</span>;
}

/** Situação de um lançamento: pago, pendente, vencido (pela data) ou cancelado. */
export function EntryBadge({ status, dueDate }: { status: string; dueDate: Date }) {
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const overdue = status === "pendente" && dueDate.toISOString().slice(0, 10) < today;
  const key = overdue ? "vencido" : status;
  const label = { pago: "Pago", pendente: "Pendente", vencido: "Vencido", cancelado: "Cancelado" }[key] ?? key;
  return <span className={`adm-badge fin-${key}`}>{label}</span>;
}

/** Situação do orçamento; enviado com a validade passada aparece como vencido. */
export function QuoteBadge({ status, validUntil }: { status: string; validUntil?: Date | null }) {
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  const expired = (status === "enviado" || status === "visualizado") && validUntil && validUntil.toISOString().slice(0, 10) < today;
  if (expired) return <span className="adm-badge q-vencido">Vencido</span>;
  return <span className={`adm-badge q-${status}`}>{labelOf(quoteStatuses, status)}</span>;
}

export function InvoiceBadge({ status, number }: { status: string; number?: string | null }) {
  return (
    <span className={`adm-badge nf-${status}`}>
      {number ? `NF ${number} · ` : ""}
      {labelOf(invoiceStatuses, status)}
    </span>
  );
}
