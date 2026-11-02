-- CreateTable
CREATE TABLE "project_columns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "wip_limit" INTEGER,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_columns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "project_columns_position_idx" ON "project_columns"("position");

-- As etapas fixas viram as colunas iniciais (mesmas chaves: nenhum projeto muda de lugar).
INSERT INTO "project_columns" ("id", "name", "position", "done") VALUES
    ('briefing', 'Briefing inicial', 0, false),
    ('prototipo', 'Protótipo', 1, false),
    ('design', 'Design', 2, false),
    ('codificacao', 'Codificação e testes', 3, false),
    ('entrega', 'Briefing de entrega', 4, false),
    ('no_ar', 'No ar', 5, true);

-- Garantia: qualquer etapa desconhecida vai para a primeira coluna antes da chave estrangeira.
UPDATE "projects" SET "stage" = 'briefing' WHERE "stage" NOT IN (SELECT "id" FROM "project_columns");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_stage_fkey" FOREIGN KEY ("stage") REFERENCES "project_columns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
