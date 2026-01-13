-- CreateEnum
CREATE TYPE "CareersPageStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "careers_page_about" TEXT,
ADD COLUMN     "careers_page_banner" TEXT,
ADD COLUMN     "careers_page_logo" TEXT,
ADD COLUMN     "careers_page_social" JSONB,
ADD COLUMN     "careers_page_status" "CareersPageStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "careers_pending_changes" JSONB,
ADD COLUMN     "careers_review_notes" JSONB;
