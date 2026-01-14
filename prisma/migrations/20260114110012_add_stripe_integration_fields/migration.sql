-- AlterEnum
ALTER TYPE "IntegrationType" ADD VALUE 'STRIPE_PAYMENTS';

-- AlterTable
ALTER TABLE "Integration" ADD COLUMN     "consultant_id" TEXT,
ADD COLUMN     "hrm8_user_id" TEXT,
ADD COLUMN     "stripe_account_id" TEXT,
ADD COLUMN     "stripe_account_status" TEXT,
ADD COLUMN     "stripe_onboarded_at" TIMESTAMP(3),
ADD COLUMN     "stripe_refresh_url" TEXT,
ADD COLUMN     "stripe_return_url" TEXT;

-- CreateIndex
CREATE INDEX "Integration_hrm8_user_id_idx" ON "Integration"("hrm8_user_id");

-- CreateIndex
CREATE INDEX "Integration_consultant_id_idx" ON "Integration"("consultant_id");

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_hrm8_user_id_fkey" FOREIGN KEY ("hrm8_user_id") REFERENCES "HRM8User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "Consultant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
