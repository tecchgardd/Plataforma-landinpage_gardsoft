import ActionForm from "@/components/admin/ActionForm";
import PageHeader from "@/components/admin/PageHeader";
import { prisma } from "@/lib/prisma";
import { requireAccess } from "@/lib/access";
import { saveExpense } from "../../../../_actions/expenses";
import ExpenseFields from "../ExpenseFields";

export const metadata = { title: "Nova despesa" };

export default async function NewExpensePage() {
  await requireAccess("financeiro", 2);
  const accounts = await prisma.financeEntry.findMany({ where: { account: { not: null } }, distinct: ["account"], select: { account: true }, take: 30 });
  const today = new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
  return (
    <>
      <PageHeader
        title="Nova despesa"
        subtitle="Mensais e anuais entram em contas a pagar sozinhas, sempre no dia do vencimento."
        back={{ href: "/admin/financeiro/despesas", label: "Despesas" }}
      />
      <div className="adm-card">
        <ActionForm action={saveExpense.bind(null, null)} submitLabel="Cadastrar despesa">
          <ExpenseFields
            accounts={accounts.map((a) => a.account!).filter(Boolean)}
            values={{
              name: "",
              kind: "software",
              supplier: null,
              amount: "",
              frequency: "mensal",
              dueDay: Number(today.slice(8, 10)),
              startMonth: today.slice(0, 7),
              dueDate: today,
              endMonth: "",
              method: "cartao",
              account: null,
              url: null,
              notes: null,
            }}
          />
        </ActionForm>
      </div>
    </>
  );
}
