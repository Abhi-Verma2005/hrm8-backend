/*
  Warnings:

  - You are about to drop the column `recruiter_email` on the `InterviewConfiguration` table. All the data in the column will be lost.
  - You are about to drop the column `recruiter_name` on the `InterviewConfiguration` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "InterviewConfiguration" DROP COLUMN "recruiter_email",
DROP COLUMN "recruiter_name";
