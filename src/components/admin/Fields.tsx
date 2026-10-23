import type { ReactNode } from "react";

type Base = { label: string; name: string; hint?: string; wide?: boolean };
type Option = { readonly value: string; readonly label: string };

function Wrap({ label, hint, wide, children }: Omit<Base, "name"> & { children: ReactNode }) {
  return (
    <label className={`adm-field ${wide ? "wide" : ""}`}>
      <span className="adm-label">{label}</span>
      {children}
      {hint && <small className="adm-hint">{hint}</small>}
    </label>
  );
}

export function Input({
  type = "text",
  defaultValue,
  required,
  placeholder,
  inputMode,
  ...base
}: Base & {
  type?: string;
  defaultValue?: string | null;
  required?: boolean;
  placeholder?: string;
  inputMode?: "decimal" | "tel" | "email" | "url";
}) {
  return (
    <Wrap {...base}>
      <input
        name={base.name}
        type={type}
        defaultValue={defaultValue ?? ""}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
      />
    </Wrap>
  );
}

export function TextArea({ defaultValue, rows = 4, placeholder, ...base }: Base & { defaultValue?: string | null; rows?: number; placeholder?: string }) {
  return (
    <Wrap {...base}>
      <textarea name={base.name} defaultValue={defaultValue ?? ""} rows={rows} placeholder={placeholder} />
    </Wrap>
  );
}

export function Select({
  options,
  defaultValue,
  empty,
  ...base
}: Base & { options: readonly Option[]; defaultValue?: string | null; empty?: string }) {
  return (
    <Wrap {...base}>
      <select name={base.name} defaultValue={defaultValue ?? ""}>
        {empty !== undefined && <option value="">{empty}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  );
}
