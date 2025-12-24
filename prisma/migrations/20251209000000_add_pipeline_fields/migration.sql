-- Add PipelineStage enum and pipeline fields to consultant_job_assignment

-- Create enum for pipeline stages
DO $$ BEGIN
  CREATE TYPE "PipelineStage" AS ENUM (
    'INTAKE',
    'SOURCING',
    'SCREENING',
    'SHORTLIST_SENT',
    'INTERVIEW',
    'OFFER',
    'PLACED',
    'ON_HOLD',
    'CLOSED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add columns if they do not exist
ALTER TABLE "ConsultantJobAssignment"
  ADD COLUMN IF NOT EXISTS "pipeline_stage" "PipelineStage" NOT NULL DEFAULT 'INTAKE',
  ADD COLUMN IF NOT EXISTS "pipeline_progress" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "pipeline_note" TEXT,
  ADD COLUMN IF NOT EXISTS "pipeline_updated_at" TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "pipeline_updated_by" TEXT;

-- Index for stage lookups
CREATE INDEX IF NOT EXISTS "ConsultantJobAssignment_pipeline_stage_idx"
  ON "ConsultantJobAssignment" ("pipeline_stage");
