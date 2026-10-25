-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "google_campaign_id" TEXT,
ADD COLUMN     "meta_campaign_id" TEXT,
ADD COLUMN     "synced_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "campaign_metrics" (
    "id" UUID NOT NULL,
    "campaign_id" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "spend_cents" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaign_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "campaign_metrics_campaign_id_platform_date_key" ON "campaign_metrics"("campaign_id", "platform", "date");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_meta_campaign_id_key" ON "campaigns"("meta_campaign_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_google_campaign_id_key" ON "campaigns"("google_campaign_id");

-- AddForeignKey
ALTER TABLE "campaign_metrics" ADD CONSTRAINT "campaign_metrics_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id") ON DELETE CASCADE ON UPDATE CASCADE;

