import { redirect } from "next/navigation";

/** Endereço antigo: receitas e despesas do mês estão na visão geral e em Recebimentos. */
export default function OldIncomeExpensesPage() {
  redirect("/admin/financeiro/recebimentos");
}
