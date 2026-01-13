-- CreateEnum
CREATE TYPE "ConversionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CONVERTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "lead_conversion_requests" (
    "id" TEXT NOT NULL,
    "lead_id" TEXT NOT NULL,
    "consultant_id" TEXT NOT NULL,
    "region_id" TEXT NOT NULL,
    "status" "ConversionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "company_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "state_province" TEXT,
    "agent_notes" TEXT,
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "admin_notes" TEXT,
    "decline_reason" TEXT,
    "converted_at" TIMESTAMP(3),
    "company_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lead_conversion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lead_conversion_requests_lead_id_idx" ON "lead_conversion_requests"("lead_id");

-- CreateIndex
CREATE INDEX "lead_conversion_requests_consultant_id_idx" ON "lead_conversion_requests"("consultant_id");

-- CreateIndex
CREATE INDEX "lead_conversion_requests_region_id_idx" ON "lead_conversion_requests"("region_id");

-- CreateIndex
CREATE INDEX "lead_conversion_requests_status_idx" ON "lead_conversion_requests"("status");

-- CreateIndex
CREATE INDEX "lead_conversion_requests_reviewed_by_idx" ON "lead_conversion_requests"("reviewed_by");

-- AddForeignKey
ALTER TABLE "lead_conversion_requests" ADD CONSTRAINT "lead_conversion_requests_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_conversion_requests" ADD CONSTRAINT "lead_conversion_requests_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "Consultant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_conversion_requests" ADD CONSTRAINT "lead_conversion_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "Consultant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_conversion_requests" ADD CONSTRAINT "lead_conversion_requests_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lead_conversion_requests" ADD CONSTRAINT "lead_conversion_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
