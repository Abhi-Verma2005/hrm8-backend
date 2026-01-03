/*
  Warnings:

  - You are about to drop the column `branding_banner_url` on the `CompanySettings` table. All the data in the column will be lost.
  - You are about to drop the column `branding_custom_css` on the `CompanySettings` table. All the data in the column will be lost.
  - You are about to drop the column `branding_logo_url` on the `CompanySettings` table. All the data in the column will be lost.
  - You are about to drop the column `branding_primary_color` on the `CompanySettings` table. All the data in the column will be lost.
  - You are about to drop the column `branding_secondary_color` on the `CompanySettings` table. All the data in the column will be lost.
  - You are about to drop the column `career_page_domain` on the `CompanySettings` table. All the data in the column will be lost.
  - You are about to drop the column `career_page_enabled` on the `CompanySettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Application" ALTER COLUMN "source" DROP DEFAULT;

-- AlterTable
ALTER TABLE "CompanySettings" DROP COLUMN "branding_banner_url",
DROP COLUMN "branding_custom_css",
DROP COLUMN "branding_logo_url",
DROP COLUMN "branding_primary_color",
DROP COLUMN "branding_secondary_color",
DROP COLUMN "career_page_domain",
DROP COLUMN "career_page_enabled";

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "auto_archive_on_expiry" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "posted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "job_category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_category_name_key" ON "job_category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "job_category_slug_key" ON "job_category"("slug");

-- CreateIndex
CREATE INDEX "Job_status_posting_date_idx" ON "Job"("status", "posting_date");

-- CreateIndex
CREATE INDEX "Job_company_id_status_idx" ON "Job"("company_id", "status");
