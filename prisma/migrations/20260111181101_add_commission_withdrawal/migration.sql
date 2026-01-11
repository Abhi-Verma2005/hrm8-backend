-- CreateEnum
CREATE TYPE "WithdrawalStatus" AS ENUM ('PENDING', 'APPROVED', 'PROCESSING', 'COMPLETED', 'REJECTED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CommissionWithdrawal" (
    "id" TEXT NOT NULL,
    "consultant_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "WithdrawalStatus" NOT NULL DEFAULT 'PENDING',
    "payment_method" TEXT NOT NULL,
    "payment_details" JSONB,
    "commission_ids" TEXT[],
    "processed_by" TEXT,
    "processed_at" TIMESTAMP(3),
    "payment_reference" TEXT,
    "admin_notes" TEXT,
    "rejection_reason" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionWithdrawal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionWithdrawal_consultant_id_idx" ON "CommissionWithdrawal"("consultant_id");

-- CreateIndex
CREATE INDEX "CommissionWithdrawal_status_idx" ON "CommissionWithdrawal"("status");

-- CreateIndex
CREATE INDEX "CommissionWithdrawal_created_at_idx" ON "CommissionWithdrawal"("created_at");

-- CreateIndex
CREATE INDEX "CommissionWithdrawal_processed_by_idx" ON "CommissionWithdrawal"("processed_by");

-- AddForeignKey
ALTER TABLE "CommissionWithdrawal" ADD CONSTRAINT "CommissionWithdrawal_consultant_id_fkey" FOREIGN KEY ("consultant_id") REFERENCES "Consultant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionWithdrawal" ADD CONSTRAINT "CommissionWithdrawal_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "Consultant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionWithdrawal" ADD CONSTRAINT "CommissionWithdrawal_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "Consultant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
