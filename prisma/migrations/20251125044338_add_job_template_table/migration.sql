/*
  Warnings:

  - The values [COMPANY_ADMIN,EMPLOYEE] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `is_company_admin` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "CompanyProfileStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CompanyProfileSection" AS ENUM ('BASIC_DETAILS', 'PRIMARY_LOCATION', 'PERSONAL_PROFILE', 'TEAM_MEMBERS', 'BILLING', 'BRANDING');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'OPEN', 'CLOSED', 'ON_HOLD', 'FILLED', 'TEMPLATE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HiringMode" AS ENUM ('SELF_MANAGED', 'SHORTLISTING', 'FULL_SERVICE', 'EXECUTIVE_SEARCH');

-- CreateEnum
CREATE TYPE "WorkArrangement" AS ENUM ('ON_SITE', 'REMOTE', 'HYBRID');

-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'CASUAL');

-- CreateEnum
CREATE TYPE "TemplateCategory" AS ENUM ('ENGINEERING', 'PRODUCT', 'DESIGN', 'MARKETING', 'SALES', 'OPERATIONS', 'HR', 'FINANCE', 'EXECUTIVE', 'OTHER');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER', 'VISITOR');
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TABLE "Session" ALTER COLUMN "user_role" TYPE "UserRole_new" USING ("user_role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
COMMIT;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "is_company_admin",
ADD COLUMN     "assigned_by" TEXT;

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "status" "CompanyProfileStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "completion_percentage" INTEGER NOT NULL DEFAULT 0,
    "completed_sections" "CompanyProfileSection"[] DEFAULT ARRAY[]::"CompanyProfileSection"[],
    "profile_data" JSONB,
    "last_reminder_at" TIMESTAMP(3),
    "skip_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "job_code" TEXT,
    "job_summary" VARCHAR(150),
    "category" TEXT,
    "number_of_vacancies" INTEGER NOT NULL DEFAULT 1,
    "department" TEXT,
    "location" TEXT NOT NULL,
    "employment_type" "EmploymentType" NOT NULL DEFAULT 'FULL_TIME',
    "work_arrangement" "WorkArrangement" NOT NULL DEFAULT 'ON_SITE',
    "salary_min" DOUBLE PRECISION,
    "salary_max" DOUBLE PRECISION,
    "salary_currency" TEXT NOT NULL DEFAULT 'USD',
    "salary_description" TEXT,
    "description" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "stealth" BOOLEAN NOT NULL DEFAULT false,
    "posting_date" TIMESTAMP(3),
    "close_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "hiring_mode" "HiringMode" NOT NULL DEFAULT 'SELF_MANAGED',
    "promotional_tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "visibility" TEXT NOT NULL DEFAULT 'public',
    "requirements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "responsibilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "terms_accepted" BOOLEAN NOT NULL DEFAULT false,
    "terms_accepted_at" TIMESTAMP(3),
    "terms_accepted_by" TEXT,
    "hiring_team" JSONB,
    "application_form" JSONB,
    "video_interviewing_enabled" BOOLEAN NOT NULL DEFAULT false,
    "alerts_enabled" JSONB,
    "jobtarget_approved" BOOLEAN NOT NULL DEFAULT false,
    "jobtarget_budget" DOUBLE PRECISION,
    "jobtarget_budget_spent" DOUBLE PRECISION DEFAULT 0,
    "jobtarget_channels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "jobtarget_promotion_id" TEXT,
    "jobtarget_status" TEXT,
    "referral_link" TEXT,
    "saved_as_template" BOOLEAN NOT NULL DEFAULT false,
    "share_link" TEXT,
    "template_id" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archived_at" TIMESTAMP(3),
    "archived_by" TEXT,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobTemplate" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "company_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "TemplateCategory" NOT NULL DEFAULT 'OTHER',
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "source_job_id" TEXT,
    "job_data" JSONB NOT NULL,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanyProfile_company_id_key" ON "CompanyProfile"("company_id");

-- CreateIndex
CREATE INDEX "CompanyProfile_company_id_idx" ON "CompanyProfile"("company_id");

-- CreateIndex
CREATE INDEX "Job_company_id_idx" ON "Job"("company_id");

-- CreateIndex
CREATE INDEX "Job_created_by_idx" ON "Job"("created_by");

-- CreateIndex
CREATE INDEX "Job_status_idx" ON "Job"("status");

-- CreateIndex
CREATE INDEX "Job_hiring_mode_idx" ON "Job"("hiring_mode");

-- CreateIndex
CREATE INDEX "Job_expiry_date_idx" ON "Job"("expiry_date");

-- CreateIndex
CREATE INDEX "JobTemplate_company_id_idx" ON "JobTemplate"("company_id");

-- CreateIndex
CREATE INDEX "JobTemplate_created_by_idx" ON "JobTemplate"("created_by");

-- CreateIndex
CREATE INDEX "JobTemplate_category_idx" ON "JobTemplate"("category");

-- CreateIndex
CREATE INDEX "JobTemplate_is_shared_idx" ON "JobTemplate"("is_shared");

-- CreateIndex
CREATE INDEX "JobTemplate_source_job_id_idx" ON "JobTemplate"("source_job_id");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTemplate" ADD CONSTRAINT "JobTemplate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTemplate" ADD CONSTRAINT "JobTemplate_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTemplate" ADD CONSTRAINT "JobTemplate_source_job_id_fkey" FOREIGN KEY ("source_job_id") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
