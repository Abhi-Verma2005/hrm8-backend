-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PENDING_VERIFICATION');

-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "ApplicationStage" AS ENUM ('NEW_APPLICATION', 'RESUME_REVIEW', 'PHONE_SCREEN', 'TECHNICAL_INTERVIEW', 'ONSITE_INTERVIEW', 'OFFER_EXTENDED', 'OFFER_ACCEPTED', 'REJECTED');

-- CreateTable
CREATE TABLE "Candidate" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "photo" TEXT,
    "linked_in_url" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT DEFAULT 'United States',
    "visa_status" TEXT,
    "work_eligibility" TEXT,
    "job_type_preference" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "salary_preference" JSONB,
    "relocation_willing" BOOLEAN DEFAULT false,
    "remote_preference" TEXT,
    "email_verified" BOOLEAN DEFAULT false,
    "status" "CandidateStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CandidateSession" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW',
    "stage" "ApplicationStage" NOT NULL DEFAULT 'NEW_APPLICATION',
    "applied_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resume_url" TEXT,
    "cover_letter_url" TEXT,
    "portfolio_url" TEXT,
    "linked_in_url" TEXT,
    "website_url" TEXT,
    "custom_answers" JSONB,
    "questionnaire_data" JSONB,
    "is_read" BOOLEAN DEFAULT false,
    "is_new" BOOLEAN DEFAULT true,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Candidate_email_key" ON "Candidate"("email");

-- CreateIndex
CREATE INDEX "Candidate_email_idx" ON "Candidate"("email");

-- CreateIndex
CREATE INDEX "Candidate_status_idx" ON "Candidate"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateSession_session_id_key" ON "CandidateSession"("session_id");

-- CreateIndex
CREATE INDEX "CandidateSession_session_id_idx" ON "CandidateSession"("session_id");

-- CreateIndex
CREATE INDEX "CandidateSession_candidate_id_idx" ON "CandidateSession"("candidate_id");

-- CreateIndex
CREATE INDEX "CandidateSession_expires_at_idx" ON "CandidateSession"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "Application_candidate_id_job_id_key" ON "Application"("candidate_id", "job_id");

-- CreateIndex
CREATE INDEX "Application_candidate_id_idx" ON "Application"("candidate_id");

-- CreateIndex
CREATE INDEX "Application_job_id_idx" ON "Application"("job_id");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE INDEX "Application_stage_idx" ON "Application"("stage");

-- CreateIndex
CREATE INDEX "Application_applied_date_idx" ON "Application"("applied_date");

-- AddForeignKey
ALTER TABLE "CandidateSession" ADD CONSTRAINT "CandidateSession_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Application" ADD CONSTRAINT "Application_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;



