import { redirect } from "next/navigation";

/** Endereço antigo: contas a receber agora se divide em Cobranças e Recebimentos. */
export default async function OldReceivablesPage({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const s = new URLSearchParams(await searchParams).toString();
  redirect(`/admin/financeiro/cobrancas${s ? `?${s}` : ""}`);
}
