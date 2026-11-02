import { getColumns } from "@/lib/project-columns";

/** Coluna do projeto no quadro ("2/6 · Design"); colunas de entrega ficam em verde. */
export default async function StageBadge({ value }: { value: string }) {
  const columns = await getColumns();
  const index = columns.findIndex((c) => c.id === value);
  const column = columns[index];
  return (
    <span className={`adm-badge stage ${column?.done ? "status-fechado" : ""}`}>
      {index + 1}/{columns.length} · {column?.name ?? value}
    </span>
  );
}
