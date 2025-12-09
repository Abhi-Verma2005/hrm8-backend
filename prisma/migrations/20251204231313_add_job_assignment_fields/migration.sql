-- CreateEnum
CREATE TYPE "JobAssignmentMode" AS ENUM ('AUTO_RULES_ONLY', 'MANUAL_ONLY');

-- CreateEnum
CREATE TYPE "AssignmentMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('AUTO_RULES', 'MANUAL_EMPLOYER', 'MANUAL_LICENSEE', 'MANUAL_HRM8');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "job_assignment_mode" "JobAssignmentMode" NOT NULL DEFAULT 'AUTO_RULES_ONLY',
ADD COLUMN "preferred_recruiter_id" TEXT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "assignment_mode" "AssignmentMode" NOT NULL DEFAULT 'AUTO',
ADD COLUMN "assignment_source" "AssignmentSource",
ADD COLUMN "assigned_consultant_id" TEXT;

-- AlterTable
ALTER TABLE "ConsultantJobAssignment" ADD COLUMN "assignment_source" "AssignmentSource";

-- CreateIndex
CREATE INDEX "Job_assigned_consultant_id_idx" ON "Job"("assigned_consultant_id");

-- CreateIndex
CREATE INDEX "Job_assignment_source_idx" ON "Job"("assignment_source");

-- CreateIndex
CREATE INDEX "Consultant_availability_status_region_id_idx" ON "Consultant"("availability", "status", "region_id");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_assigned_consultant_id_fkey" FOREIGN KEY ("assigned_consultant_id") REFERENCES "Consultant"("id") ON DELETE SET NULL ON UPDATE CASCADE;





