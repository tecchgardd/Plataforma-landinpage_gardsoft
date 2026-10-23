-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "asaas_customer_id" TEXT;

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "client_id" UUID NOT NULL,
    "project_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "scope" TEXT NOT NULL,
    "clauses" TEXT NOT NULL,
    "value_cents" INTEGER NOT NULL,
    "payment_plan" JSONB NOT NULL,
    "delivery_days" INTEGER,
    "token" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "viewed_at" TIMESTAMP(3),
    "signed_at" TIMESTAMP(3),
    "signer_name" TEXT,
    "signer_document" TEXT,
    "signer_email" TEXT,
    "signer_ip" TEXT,
    "signer_user_agent" TEXT,
    "signature_image" TEXT,
    "content_hash" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_entries" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendente',
    "paid_at" DATE,
    "paid_amount_cents" INTEGER,
    "method" TEXT,
    "client_id" UUID,
    "project_id" UUID,
    "contract_id" UUID,
    "supplier" TEXT,
    "installment_number" INTEGER,
    "installment_total" INTEGER,
    "group_id" TEXT,
    "asaas_payment_id" TEXT,
    "asaas_status" TEXT,
    "invoice_url" TEXT,
    "bank_slip_url" TEXT,
    "asaas_invoice_id" TEXT,
    "nf_status" TEXT,
    "nf_number" TEXT,
    "nf_pdf_url" TEXT,
    "nf_xml_url" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_files" (
    "id" UUID NOT NULL,
    "entry_id" UUID NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'comprovante',
    "name" TEXT NOT NULL,
    "label" TEXT,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contracts_number_key" ON "contracts"("number");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_token_key" ON "contracts"("token");

-- CreateIndex
CREATE INDEX "contracts_client_id_idx" ON "contracts"("client_id");

-- CreateIndex
CREATE INDEX "contracts_status_idx" ON "contracts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "finance_entries_asaas_payment_id_key" ON "finance_entries"("asaas_payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "finance_entries_asaas_invoice_id_key" ON "finance_entries"("asaas_invoice_id");

-- CreateIndex
CREATE INDEX "finance_entries_type_status_due_date_idx" ON "finance_entries"("type", "status", "due_date");

-- CreateIndex
CREATE INDEX "finance_entries_client_id_idx" ON "finance_entries"("client_id");

-- CreateIndex
CREATE INDEX "finance_entries_contract_id_idx" ON "finance_entries"("contract_id");

-- CreateIndex
CREATE INDEX "finance_files_entry_id_idx" ON "finance_files"("entry_id");

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_entries" ADD CONSTRAINT "finance_entries_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_files" ADD CONSTRAINT "finance_files_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "finance_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
