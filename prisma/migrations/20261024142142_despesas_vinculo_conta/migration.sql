/*
  Warnings:

  - You are about to drop the column `expenseId` on the `finance_entries` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "finance_entries" DROP CONSTRAINT "finance_entries_expenseId_fkey";

-- AlterTable
ALTER TABLE "finance_entries" DROP COLUMN "expenseId",
ADD COLUMN     "account" TEXT,
ADD COLUMN     "expense_id" UUID;

-- CreateIndex
CREATE INDEX "finance_entries_expense_id_idx" ON "finance_entries"("expense_id");

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_expense_id_fkey" FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
