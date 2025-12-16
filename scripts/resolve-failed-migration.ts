/**
 * Script to resolve failed Prisma migration
 * This marks the failed migration as rolled back so new migrations can be applied
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resolveFailedMigration() {
  console.log('🔧 Resolving failed migration...\n');

  try {
    // Check if _prisma_migrations table exists and find the failed migration
    const failedMigrations = await prisma.$queryRawUnsafe<Array<{
      migration_name: string;
      finished_at: Date | null;
      rolled_back_at: Date | null;
    }>>(`
      SELECT migration_name, finished_at, rolled_back_at
      FROM "_prisma_migrations"
      WHERE migration_name LIKE '%add_job_assignment_fields%'
      AND finished_at IS NULL
      ORDER BY started_at DESC
    `);

    if (failedMigrations.length === 0) {
      console.log('✅ No failed migrations found. Database is clean.\n');
      return;
    }

    console.log(`Found ${failedMigrations.length} failed migration(s):\n`);
    failedMigrations.forEach(m => console.log(`  - ${m.migration_name}`));
    console.log('');

    // Mark all failed migrations as rolled back
    console.log('Marking failed migrations as rolled back...');
    for (const failedMigration of failedMigrations) {
      await prisma.$executeRawUnsafe(`
        UPDATE "_prisma_migrations"
        SET rolled_back_at = NOW()
        WHERE migration_name = $1
        AND finished_at IS NULL
      `, failedMigration.migration_name);
      console.log(`  ✅ Marked ${failedMigration.migration_name} as rolled back`);
    }

    console.log('\n✅ All failed migrations marked as rolled back.\n');
    console.log('You can now run: pnpm run db:deploy\n');

  } catch (error: any) {
    // If the error is about table not existing, that's okay - migrations haven't run yet
    if (error.message?.includes('does not exist') || error.message?.includes('relation "_prisma_migrations"')) {
      console.log('ℹ️  Migration table does not exist yet. This is normal for a fresh database.\n');
      return;
    }
    console.error('❌ Error resolving migration:', error.message);
    // Don't throw - allow deployment to continue
    console.log('⚠️  Continuing with deployment anyway...\n');
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
resolveFailedMigration()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    // Don't fail the deployment if this script fails
    console.error('⚠️  Script encountered an error (continuing anyway):', error.message);
    process.exit(0); // Exit with 0 to allow deployment to continue
  });



