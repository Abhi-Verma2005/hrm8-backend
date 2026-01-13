-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "transaction_refund_requests" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "transaction_type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "processed_by" TEXT,
    "processed_at" TIMESTAMP(3),
    "payment_reference" TEXT,
    "admin_notes" TEXT,
    "rejection_reason" TEXT,
    "rejected_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "stripe_refund_id" TEXT,
    "refund_initiated_at" TIMESTAMP(3),
    "refund_completed_at" TIMESTAMP(3),
    "refund_failed_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transaction_refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "transaction_refund_requests_company_id_idx" ON "transaction_refund_requests"("company_id");

-- CreateIndex
CREATE INDEX "transaction_refund_requests_status_idx" ON "transaction_refund_requests"("status");

-- CreateIndex
CREATE INDEX "transaction_refund_requests_created_at_idx" ON "transaction_refund_requests"("created_at");

-- CreateIndex
CREATE INDEX "transaction_refund_requests_processed_by_idx" ON "transaction_refund_requests"("processed_by");

-- AddForeignKey
ALTER TABLE "transaction_refund_requests" ADD CONSTRAINT "transaction_refund_requests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
