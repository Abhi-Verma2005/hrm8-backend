-- Add videoInterviewingEnabled column to Job table
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS "video_interviewing_enabled" BOOLEAN NOT NULL DEFAULT false;




