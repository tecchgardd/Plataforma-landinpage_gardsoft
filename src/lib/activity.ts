import "server-only";
import { prisma } from "./prisma";

export type Entity =
  | "lead"
  | "cliente"
  | "projeto"
  | "campanha"
  | "conteudo"
  | "usuario"
  | "perfil"
  | "orcamento"
  | "contrato"
  | "financeiro"
  | "notafiscal"
  | "comercial"
  | "documento"
  | "acesso"
  | "meta"
  | "integracao";

/**
 * Registra uma ação no histórico do portal.
 * Falhas no registro nunca interrompem a ação principal.
 */
export async function logActivity(
  user: { id: string; name: string },
  action: string,
  entity: Entity,
  summary: string,
  entityId?: string | null,
) {
  try {
    await prisma.activityLog.create({
      data: { userId: user.id, userName: user.name, action, entity, entityId: entityId ?? null, summary: summary.slice(0, 500) },
    });
  } catch (error) {
    console.error("Falha ao registrar histórico", error);
  }
}

/** Colaboradores para os seletores de "responsável". */
export function getTeam() {
  return prisma.user.findMany({ select: { id: true, name: true, image: true }, orderBy: { name: "asc" } });
}

/** Registro de ações automáticas (webhook do Asaas, assinatura do cliente). */
export async function logSystem(action: string, entity: Entity, summary: string, entityId?: string | null, who = "Sistema") {
  try {
    await prisma.activityLog.create({
      data: { userId: null, userName: who, action, entity, entityId: entityId ?? null, summary: summary.slice(0, 500) },
    });
  } catch (error) {
    console.error("Falha ao registrar histórico", error);
  }
}
