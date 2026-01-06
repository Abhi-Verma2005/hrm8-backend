-- DropForeignKey
ALTER TABLE "HRM8User" DROP CONSTRAINT "HRM8User_licensee_id_fkey";

-- AlterTable
ALTER TABLE "Bill" ADD COLUMN     "region_id" TEXT;

-- CreateIndex
CREATE INDEX "Bill_region_id_idx" ON "Bill"("region_id");

-- AddForeignKey
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_region_id_fkey" FOREIGN KEY ("region_id") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;
