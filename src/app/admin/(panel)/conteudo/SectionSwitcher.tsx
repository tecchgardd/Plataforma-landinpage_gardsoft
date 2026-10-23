"use client";

import { useRouter } from "next/navigation";

/** Menu suspenso para pular entre as seções da landing page. */
export default function SectionSwitcher({ current, sections }: { current: string; sections: { key: string; title: string }[] }) {
  const router = useRouter();
  return (
    <label className="adm-switcher">
      <span className="adm-label">Seção da landing page</span>
      <select value={current} onChange={(e) => router.push(`/admin/conteudo/${e.target.value}`)}>
        {sections.map((s, i) => (
          <option key={s.key} value={s.key}>
            {String(i + 1).padStart(2, "0")} · {s.title}
          </option>
        ))}
      </select>
    </label>
  );
}
