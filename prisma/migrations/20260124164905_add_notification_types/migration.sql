-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UniversalNotificationType" ADD VALUE 'REFUND_STATUS_CHANGED';
ALTER TYPE "UniversalNotificationType" ADD VALUE 'SUBSCRIPTION_RENEWAL_FAILED';
ALTER TYPE "UniversalNotificationType" ADD VALUE 'WITHDRAWAL_APPROVED';
ALTER TYPE "UniversalNotificationType" ADD VALUE 'WITHDRAWAL_REJECTED';
ALTER TYPE "UniversalNotificationType" ADD VALUE 'LOW_BALANCE_WARNING';
