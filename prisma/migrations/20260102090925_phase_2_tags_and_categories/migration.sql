-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "category_id" TEXT;

-- CreateTable
CREATE TABLE "job_tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "color" TEXT DEFAULT '#3B82F6',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_tag_assignment" (
    "job_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_tag_assignment_pkey" PRIMARY KEY ("job_id","tag_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_tag_name_key" ON "job_tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "job_tag_slug_key" ON "job_tag"("slug");

-- CreateIndex
CREATE INDEX "job_tag_assignment_job_id_idx" ON "job_tag_assignment"("job_id");

-- CreateIndex
CREATE INDEX "job_tag_assignment_tag_id_idx" ON "job_tag_assignment"("tag_id");

-- CreateIndex
CREATE INDEX "Job_category_id_idx" ON "Job"("category_id");

-- AddForeignKey
ALTER TABLE "Job" ADD CONSTRAINT "Job_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "job_category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_tag_assignment" ADD CONSTRAINT "job_tag_assignment_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_tag_assignment" ADD CONSTRAINT "job_tag_assignment_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "job_tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
