/*
  Warnings:

  - The values [FREE,BASIC,PROFESSIONAL] on the enum `SubscriptionPlanType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "SubscriptionPlanType_new" AS ENUM ('ATS_LITE', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE', 'CUSTOM');
ALTER TABLE "Subscription" ALTER COLUMN "planType" TYPE "SubscriptionPlanType_new" USING ("planType"::text::"SubscriptionPlanType_new");
ALTER TYPE "SubscriptionPlanType" RENAME TO "SubscriptionPlanType_old";
ALTER TYPE "SubscriptionPlanType_new" RENAME TO "SubscriptionPlanType";
DROP TYPE "public"."SubscriptionPlanType_old";
COMMIT;
