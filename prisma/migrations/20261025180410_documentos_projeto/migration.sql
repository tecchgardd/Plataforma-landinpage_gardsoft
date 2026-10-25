-- CreateTable
CREATE TABLE "project_documents" (
    "id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "project_id" UUID,
    "client_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "sections" JSONB NOT NULL DEFAULT '[]',
    "version" INTEGER NOT NULL DEFAULT 1,
    "token" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "viewed_at" TIMESTAMP(3),
    "decided_at" TIMESTAMP(3),
    "approver_name" TEXT,
    "approver_email" TEXT,
    "approver_ip" TEXT,
    "approver_agent" TEXT,
    "content_hash" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_files" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_events" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "note" TEXT,
    "actor" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_documents_number_key" ON "project_documents"("number");

-- CreateIndex
CREATE UNIQUE INDEX "project_documents_token_key" ON "project_documents"("token");

-- CreateIndex
CREATE INDEX "project_documents_project_id_idx" ON "project_documents"("project_id");

-- CreateIndex
CREATE INDEX "project_documents_client_id_idx" ON "project_documents"("client_id");

-- CreateIndex
CREATE INDEX "project_documents_status_idx" ON "project_documents"("status");

-- CreateIndex
CREATE INDEX "document_files_document_id_idx" ON "document_files"("document_id");

-- CreateIndex
CREATE INDEX "document_events_document_id_created_at_idx" ON "document_events"("document_id", "created_at");

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_documents" ADD CONSTRAINT "project_documents_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_files" ADD CONSTRAINT "document_files_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "project_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_events" ADD CONSTRAINT "document_events_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "project_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
