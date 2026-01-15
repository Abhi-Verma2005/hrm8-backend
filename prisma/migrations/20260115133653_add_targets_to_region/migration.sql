-- AlterTable
ALTER TABLE "Region" ADD COLUMN     "monthly_placement_target" INTEGER DEFAULT 0,
ADD COLUMN     "monthly_revenue_target" DOUBLE PRECISION DEFAULT 0;
