import type { ReactNode } from "react";
import { getAccess } from "@/lib/access";
import type { Level, ModuleKey } from "@/lib/permissions";

/** Mostra o conteúdo só se o perfil tem o nível pedido no módulo (o servidor também confere na ação). */
export default async function Can({ module, level, children }: { module: ModuleKey; level: Level; children: ReactNode }) {
  const access = await getAccess();
  return access && access.level(module) >= level ? <>{children}</> : null;
}
