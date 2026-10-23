import {
  campaignStatuses,
  labelOf,
  leadStatuses,
  projectStages,
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
