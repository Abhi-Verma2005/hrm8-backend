-- CreateEnum
CREATE TYPE "VirtualAccountOwner" AS ENUM ('COMPANY', 'CONSULTANT', 'SALES_AGENT', 'HRM8_GLOBAL');

-- CreateEnum
CREATE TYPE "VirtualAccountStatus" AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "VirtualTransactionType" AS ENUM ('SUBSCRIPTION_PURCHASE', 'SUBSCRIPTION_REFUND', 'JOB_POSTING_DEDUCTION', 'JOB_REFUND', 'COMMISSION_EARNED', 'COMMISSION_WITHDRAWAL', 'ADDON_SERVICE_CHARGE', 'ADDON_SERVICE_REFUND', 'ADMIN_ADJUSTMENT', 'PLATFORM_FEE', 'TRANSFER_IN', 'TRANSFER_OUT');

-- CreateEnum
CREATE TYPE "TransactionDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

-- AlterTable
ALTER TABLE "CommissionWithdrawal" ADD COLUMN     "debited_from_wallet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "virtual_transaction_id" TEXT,
ADD COLUMN     "wallet_debit_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "auto_renew" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "job_quota" INTEGER,
ADD COLUMN     "jobs_used" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "prepaid_balance" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "renewal_failed_at" TIMESTAMP(3),
ADD COLUMN     "renewal_failure_reason" TEXT;

-- CreateTable
CREATE TABLE "virtual_accounts" (
    "id" TEXT NOT NULL,
    "owner_type" "VirtualAccountOwner" NOT NULL,
    "owner_id" TEXT NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_credits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_debits" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "VirtualAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "frozen_at" TIMESTAMP(3),
    "frozen_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "virtual_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "virtual_transactions" (
    "id" TEXT NOT NULL,
    "virtual_account_id" TEXT NOT NULL,
    "type" "VirtualTransactionType" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance_after" DOUBLE PRECISION NOT NULL,
    "direction" "TransactionDirection" NOT NULL,
    "description" TEXT,
    "metadata" JSONB,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "subscription_id" TEXT,
    "job_id" TEXT,
    "bill_id" TEXT,
    "commission_id" TEXT,
    "refund_request_id" TEXT,
    "withdrawal_request_id" TEXT,
    "counterparty_type" "VirtualAccountOwner",
    "counterparty_id" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'COMPLETED',
    "failed_reason" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "virtual_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "virtual_accounts_owner_type_owner_id_idx" ON "virtual_accounts"("owner_type", "owner_id");

-- CreateIndex
CREATE INDEX "virtual_accounts_status_idx" ON "virtual_accounts"("status");

-- CreateIndex
CREATE UNIQUE INDEX "virtual_accounts_owner_type_owner_id_key" ON "virtual_accounts"("owner_type", "owner_id");

-- CreateIndex
CREATE INDEX "virtual_transactions_virtual_account_id_idx" ON "virtual_transactions"("virtual_account_id");

-- CreateIndex
CREATE INDEX "virtual_transactions_type_idx" ON "virtual_transactions"("type");

-- CreateIndex
CREATE INDEX "virtual_transactions_reference_type_reference_id_idx" ON "virtual_transactions"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "virtual_transactions_created_at_idx" ON "virtual_transactions"("created_at");

-- CreateIndex
CREATE INDEX "virtual_transactions_status_idx" ON "virtual_transactions"("status");

-- CreateIndex
CREATE INDEX "virtual_transactions_direction_idx" ON "virtual_transactions"("direction");

-- AddForeignKey
ALTER TABLE "virtual_transactions" ADD CONSTRAINT "virtual_transactions_virtual_account_id_fkey" FOREIGN KEY ("virtual_account_id") REFERENCES "virtual_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
