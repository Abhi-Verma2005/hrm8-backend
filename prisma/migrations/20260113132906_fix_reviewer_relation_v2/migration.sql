-- DropForeignKey
ALTER TABLE "lead_conversion_requests" DROP CONSTRAINT "lead_conversion_requests_reviewed_by_fkey";

-- AddForeignKey
ALTER TABLE "lead_conversion_requests" ADD CONSTRAINT "lead_conversion_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "HRM8User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
