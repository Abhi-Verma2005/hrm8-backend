-- SQL script to resolve failed Prisma migration
-- Run this directly on your database if the TypeScript script doesn't work

-- Mark the failed migration as rolled back
UPDATE "_prisma_migrations"
SET rolled_back_at = NOW()
WHERE migration_name LIKE '%add_job_assignment_fields%'
AND finished_at IS NULL;

-- Verify the update
SELECT migration_name, started_at, finished_at, rolled_back_at
FROM "_prisma_migrations"
WHERE migration_name LIKE '%add_job_assignment_fields%'
ORDER BY started_at DESC;











