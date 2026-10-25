"use client";

import { useState } from "react";
import { levels, modules, type Level, type ModuleKey, type Permissions } from "@/lib/permissions";

const groups = [...new Set(modules.map((m) => m.group))];

/**
 * Matriz de permissões (estilo GLPI): uma linha por módulo, um nível por linha.
 * Os atalhos por grupo aplicam o mesmo nível a todos os módulos do grupo.
 */
export default function RoleMatrix({ initial, locked = false }: { initial: Permissions; locked?: boolean }) {
  const [perms, setPerms] = useState<Record<ModuleKey, Level>>(
    () => Object.fromEntries(modules.map((m) => [m.key, locked ? 3 : (initial[m.key] ?? 0)])) as Record<ModuleKey, Level>,
  );
  const set = (key: ModuleKey, value: Level) => setPerms((p) => ({ ...p, [key]: value }));
  const setGroup = (group: string, value: Level) =>
    setPerms((p) => ({ ...p, ...Object.fromEntries(modules.filter((m) => m.group === group).map((m) => [m.key, value])) }));

  return (
    <div className="adm-matrix wide">
      {locked && <p className="adm-alert">O super admin tem acesso total a todos os módulos, sempre. Só o nome e a descrição podem mudar.</p>}
      {groups.map((group) => (
        <fieldset key={group} className="adm-matrix-group" disabled={locked}>
          <legend>
            <span>{group}</span>
            <span className="adm-matrix-quick" aria-label={`Aplicar a todo o grupo ${group}`}>
              {levels.map((l) => (
                <button key={l.value} type="button" className="adm-link-btn" onClick={() => setGroup(group, l.value)} disabled={locked}>
                  {l.value === 0 ? "Nenhum" : l.label}
                </button>
              ))}
            </span>
          </legend>
          {modules
            .filter((m) => m.group === group)
            .map((m) => (
              <div key={m.key} className="adm-matrix-row">
                <div className="adm-matrix-label">
                  <strong>{m.label}</strong>
                  {"hint" in m && <small>{m.hint}</small>}
                </div>
                <div className="adm-segmented" role="radiogroup" aria-label={m.label}>
                  {levels.map((l) => (
                    <label key={l.value} className={perms[m.key] === l.value ? `on lv-${l.value}` : ""}>
                      <input
                        type="radio"
                        name={`perm_${m.key}`}
                        value={l.value}
                        checked={perms[m.key] === l.value}
                        onChange={() => set(m.key, l.value)}
                      />
                      {l.label}
                    </label>
                  ))}
                </div>
              </div>
            ))}
        </fieldset>
      ))}
      <p className="adm-hint">
        <strong>Ver</strong>: abre e consulta. <strong>Editar</strong>: também cria e altera. <strong>Excluir</strong>: acesso total, inclusive apagar.
      </p>
    </div>
  );
}
