import { redirect } from "next/navigation";

/** Atalho "novo lançamento": cobrança (a receber) ou despesa (a pagar). */
export default async function NewEntryPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  redirect((await searchParams).tipo === "pagar" ? "/admin/financeiro/despesas/nova" : "/admin/financeiro/cobrancas/nova");
}
