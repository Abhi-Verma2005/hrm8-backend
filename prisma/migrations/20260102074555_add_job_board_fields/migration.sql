-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "source" TEXT DEFAULT 'HRM8_JOB_BOARD';

-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN     "branding_banner_url" TEXT,
ADD COLUMN     "branding_custom_css" TEXT,
ADD COLUMN     "branding_logo_url" TEXT,
ADD COLUMN     "branding_primary_color" TEXT,
ADD COLUMN     "branding_secondary_color" TEXT,
ADD COLUMN     "career_page_domain" TEXT,
ADD COLUMN     "career_page_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "clicks_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "views_count" INTEGER NOT NULL DEFAULT 0;
