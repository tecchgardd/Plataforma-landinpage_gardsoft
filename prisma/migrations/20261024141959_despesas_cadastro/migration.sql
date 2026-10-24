-- AlterTable
ALTER TABLE "finance_entries" ADD COLUMN     "expenseId" UUID;

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "supplier" TEXT,
    "amount_cents" INTEGER NOT NULL,
    "frequency" TEXT NOT NULL,
    "due_day" INTEGER,
    "due_month" INTEGER,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "generated_until" DATE,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "method" TEXT,
    "account" TEXT,
    "url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "expenses_active_frequency_idx" ON "expenses"("active", "frequency");

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
