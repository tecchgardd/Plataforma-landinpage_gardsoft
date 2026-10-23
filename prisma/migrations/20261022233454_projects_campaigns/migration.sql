-- Canal único -> lista de canais (preserva o canal já cadastrado)
ALTER TABLE "campaigns" ADD COLUMN "channels" TEXT[] DEFAULT ARRAY[]::TEXT[];
UPDATE "campaigns" SET "channels" = ARRAY["channel"] WHERE "channel" IS NOT NULL;
ALTER TABLE "campaigns" DROP COLUMN "channel";

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "description" TEXT,
ADD COLUMN     "design_url" TEXT,
ADD COLUMN     "docs_url" TEXT,
ADD COLUMN     "github_url" TEXT,
ADD COLUMN     "lead_id" UUID,
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "preview_url" TEXT;

-- CreateTable
CREATE TABLE "campaign_costs" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "amount_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_costs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_notes" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "author" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'nota',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_files" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "mime" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "campaign_costs_campaign_id_idx" ON "campaign_costs"("campaign_id");

-- CreateIndex
CREATE INDEX "project_tasks_project_id_idx" ON "project_tasks"("project_id");

-- CreateIndex
CREATE INDEX "project_notes_project_id_idx" ON "project_notes"("project_id");

-- CreateIndex
CREATE INDEX "project_files_project_id_idx" ON "project_files"("project_id");

-- CreateIndex
CREATE INDEX "projects_stage_position_idx" ON "projects"("stage", "position");

-- AddForeignKey
ALTER TABLE "campaign_costs" ADD CONSTRAINT "campaign_costs_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_tasks" ADD CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_notes" ADD CONSTRAINT "project_notes_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_files" ADD CONSTRAINT "project_files_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Investimento já registrado vira o primeiro item de custo
INSERT INTO "campaign_costs" ("id", "campaign_id", "type", "description", "amount_cents")
SELECT gen_random_uuid(), "id", 'outro', 'Investimento registrado antes do detalhamento', "budget_cents"
FROM "campaigns" WHERE "budget_cents" > 0;
