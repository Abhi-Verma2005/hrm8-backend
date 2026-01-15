-- CreateEnum
CREATE TYPE "UniversalNotificationType" AS ENUM ('NEW_APPLICATION', 'APPLICATION_STATUS_CHANGED', 'APPLICATION_SHORTLISTED', 'APPLICATION_REJECTED', 'JOB_CREATED', 'JOB_STATUS_CHANGED', 'JOB_ASSIGNED', 'JOB_FILLED', 'CANDIDATE_STAGE_CHANGED', 'INTERVIEW_SCHEDULED', 'OFFER_EXTENDED', 'NEW_LEAD', 'LEAD_CONVERTED', 'SUBSCRIPTION_PURCHASED', 'SERVICE_PURCHASED', 'JOB_ASSIGNMENT_RECEIVED', 'SHORTLIST_SUBMITTED', 'SYSTEM_ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "NotificationRecipientType" AS ENUM ('USER', 'CANDIDATE', 'CONSULTANT', 'HRM8_USER');

-- CreateTable
CREATE TABLE "universal_notifications" (
    "id" TEXT NOT NULL,
    "recipient_type" "NotificationRecipientType" NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "type" "UniversalNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "job_id" TEXT,
    "application_id" TEXT,
    "company_id" TEXT,
    "lead_id" TEXT,
    "region_id" TEXT,
    "action_url" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "universal_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "universal_notifications_recipient_type_recipient_id_idx" ON "universal_notifications"("recipient_type", "recipient_id");

-- CreateIndex
CREATE INDEX "universal_notifications_recipient_id_read_idx" ON "universal_notifications"("recipient_id", "read");

-- CreateIndex
CREATE INDEX "universal_notifications_created_at_idx" ON "universal_notifications"("created_at");

-- CreateIndex
CREATE INDEX "universal_notifications_expires_at_idx" ON "universal_notifications"("expires_at");
