-- Orçamentos, notas fiscais (Asaas + manuais) e arquivos das notas.
-- As notas que estavam em finance_entries (nf_*) são copiadas para invoices antes de remover as colunas.

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "client_id" UUID,
    "lead_id" UUID,
    "project_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "intro" TEXT,
    "items" JSONB NOT NULL,
    "discount_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cents" INTEGER NOT NULL,
    "valid_until" DATE,
    "delivery_days" INTEGER,
    "payment_terms" TEXT,
    "notes" TEXT,
    "token" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "viewed_at" TIMESTAMP(3),
    "decided_at" TIMESTAMP(3),
    "decision_name" TEXT,
    "decision_note" TEXT,
    "decision_ip" TEXT,
    "contract_id" UUID,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "number" TEXT,
    "series" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "issue_date" DATE,
    "amount_cents" INTEGER NOT NULL,
    "iss_cents" INTEGER,
    "description" TEXT NOT NULL,
    "verification_code" TEXT,
    "client_id" UUID,
    "entry_id" UUID,
    "asaas_invoice_id" TEXT,
    "asaas_status" TEXT,
    "pdf_url" TEXT,
    "xml_url" TEXT,
    "error_message" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_files" (
    "id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotes_number_key" ON "quotes"("number");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_token_key" ON "quotes"("token");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_contract_id_key" ON "quotes"("contract_id");

-- CreateIndex
CREATE INDEX "quotes_status_idx" ON "quotes"("status");

-- CreateIndex
CREATE INDEX "quotes_client_id_idx" ON "quotes"("client_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_entry_id_key" ON "invoices"("entry_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_asaas_invoice_id_key" ON "invoices"("asaas_invoice_id");

-- CreateIndex
CREATE INDEX "invoices_status_issue_date_idx" ON "invoices"("status", "issue_date");

-- CreateIndex
CREATE INDEX "invoices_client_id_idx" ON "invoices"("client_id");

-- CreateIndex
CREATE INDEX "invoice_files_invoice_id_idx" ON "invoice_files"("invoice_id");

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "finance_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoice_files" ADD CONSTRAINT "invoice_files_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Copia as notas já solicitadas no Asaas
INSERT INTO "invoices" ("id", "number", "status", "source", "issue_date", "amount_cents", "description", "client_id", "entry_id", "asaas_invoice_id", "asaas_status", "pdf_url", "xml_url", "updated_at")
SELECT gen_random_uuid(), "nf_number",
  CASE "nf_status" WHEN 'AUTHORIZED' THEN 'emitida' WHEN 'CANCELED' THEN 'cancelada' WHEN 'ERROR' THEN 'erro' ELSE 'pendente' END,
  'asaas', "paid_at", COALESCE("paid_amount_cents", "amount_cents"), "description", "client_id", "id", "asaas_invoice_id", "nf_status", "nf_pdf_url", "nf_xml_url", CURRENT_TIMESTAMP
FROM "finance_entries"
WHERE "asaas_invoice_id" IS NOT NULL;

-- DropIndex
DROP INDEX "finance_entries_asaas_invoice_id_key";

-- AlterTable
ALTER TABLE "finance_entries" DROP COLUMN "asaas_invoice_id",
DROP COLUMN "nf_number",
DROP COLUMN "nf_pdf_url",
DROP COLUMN "nf_status",
DROP COLUMN "nf_xml_url";
