-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "target" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "goals_month_metric_key" ON "goals"("month", "metric");
