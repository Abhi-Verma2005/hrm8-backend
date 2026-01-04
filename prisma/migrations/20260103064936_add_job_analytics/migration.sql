-- CreateTable
CREATE TABLE "job_analytics" (
    "id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "session_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "referrer" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "job_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_analytics_job_id_event_type_created_at_idx" ON "job_analytics"("job_id", "event_type", "created_at");

-- CreateIndex
CREATE INDEX "job_analytics_created_at_idx" ON "job_analytics"("created_at");

-- CreateIndex
CREATE INDEX "job_analytics_session_id_idx" ON "job_analytics"("session_id");

-- AddForeignKey
ALTER TABLE "job_analytics" ADD CONSTRAINT "job_analytics_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
