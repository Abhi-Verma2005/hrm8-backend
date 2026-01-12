-- AlterTable
ALTER TABLE "CommissionWithdrawal" ADD COLUMN     "stripe_payout_id" TEXT,
ADD COLUMN     "stripe_transfer_id" TEXT,
ADD COLUMN     "transfer_completed_at" TIMESTAMP(3),
ADD COLUMN     "transfer_failed_reason" TEXT,
ADD COLUMN     "transfer_initiated_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Consultant" ADD COLUMN     "payout_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "stripe_account_id" TEXT,
ADD COLUMN     "stripe_account_status" TEXT,
ADD COLUMN     "stripe_onboarded_at" TIMESTAMP(3);
