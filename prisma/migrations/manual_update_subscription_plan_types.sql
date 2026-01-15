-- Step 1: Add new enum values
ALTER TYPE "SubscriptionPlanType" ADD VALUE IF NOT EXISTS 'ATS_LITE';
ALTER TYPE "SubscriptionPlanType" ADD VALUE IF NOT EXISTS 'SMALL';
ALTER TYPE "SubscriptionPlanType" ADD VALUE IF NOT EXISTS 'MEDIUM';
ALTER TYPE "SubscriptionPlanType" ADD VALUE IF NOT EXISTS 'LARGE';

-- Step 2: Update existing data
UPDATE "Subscription" SET "planType" = 'ATS_LITE' WHERE "planType" = 'FREE';
UPDATE "Subscription" SET "planType" = 'SMALL' WHERE "planType" = 'BASIC';
UPDATE "Subscription" SET "planType" = 'MEDIUM' WHERE "planType" = 'PROFESSIONAL';

-- Step 3: Remove old enum values (PostgreSQL doesn't support removing enum values directly)
-- We need to recreate the enum type

-- Create new enum with only the values we want
CREATE TYPE "SubscriptionPlanType_new" AS ENUM ('ATS_LITE', 'SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE', 'CUSTOM');

-- Update the column to use the new type
ALTER TABLE "Subscription" ALTER COLUMN "planType" TYPE "SubscriptionPlanType_new" USING ("planType"::text::"SubscriptionPlanType_new");

-- Drop the old enum and rename the new one
DROP TYPE "SubscriptionPlanType";
ALTER TYPE "SubscriptionPlanType_new" RENAME TO "SubscriptionPlanType";
