"use client";

import { useOptimistic, useTransition } from "react";
import { setLeadTemperature } from "../../../_actions/leads";
import { temperatures } from "@/lib/admin/options";

/** Troca rápida de temperatura, sem precisar salvar o formulário. */
export default function TempSwitch({ id, value }: { id: string; value: string }) {
  const [current, setCurrent] = useOptimistic(value);
  const [, startTransition] = useTransition();

  return (
    <div className="adm-temp-switch" role="radiogroup" aria-label="Temperatura do lead">
      {temperatures.map((t) => (
        <button
          key={t.value}
          type="button"
          role="radio"
          aria-checked={current === t.value}
          className={`temp-${t.value} ${current === t.value ? "on" : ""}`}
          onClick={() =>
            startTransition(async () => {
              setCurrent(t.value);
              await setLeadTemperature(id, t.value);
            })
          }
        >
          <span aria-hidden="true">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}
