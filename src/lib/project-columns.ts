import "server-only";
import { cache } from "react";
import { prisma, type Prisma } from "./prisma";

export type BoardColumn = { id: string; name: string; position: number; wipLimit: number | null; done: boolean };

/** Colunas do quadro de projetos, da esquerda para a direita (uma consulta por requisição). */
export const getColumns = cache(
  (): Promise<BoardColumn[]> =>
    prisma.projectColumn.findMany({
      select: { id: true, name: true, position: true, wipLimit: true, done: true },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    }),
);

/** Filtro do Prisma para projetos em andamento (fora das colunas de entrega). */
export const activeProject = { column: { done: false } } satisfies Prisma.ProjectWhereInput;
