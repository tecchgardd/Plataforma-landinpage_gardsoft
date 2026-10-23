import Link from "next/link";
import type { ReactNode } from "react";

export default function PageHeader({
  title,
  subtitle,
  back,
  actions,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
  actions?: ReactNode;
}) {
  return (
    <header className="adm-page-head">
      <div>
        {back && (
          <Link href={back.href} className="adm-back">
            ← {back.label}
          </Link>
        )}
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="adm-page-actions">{actions}</div>}
    </header>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="adm-empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
    </div>
  );
}
