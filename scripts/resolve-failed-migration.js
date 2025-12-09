/**
 * JavaScript version of resolve-failed-migration script
 * Can be run directly with node (no compilation needed)
 * 
 * This script checks if failed migrations are already applied in the database.
 * If they are, it marks them as completed. If not, it marks them as rolled back.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function resolveFailedMigration() {
  console.log('🔧 Resolving failed migration...\n');

  try {
    // Check if _prisma_migrations table exists and find the failed migration
    const failedMigrations = await prisma.$queryRawUnsafe(`
      SELECT migration_name, finished_at, rolled_back_at, started_at
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

    // Check if the migration changes are already applied
    console.log('Checking if migration changes are already applied...');
    
    let migrationAlreadyApplied = false;
    try {
      // Check if the enum types exist (they were created in the migration)
      const enumCheck = await prisma.$queryRawUnsafe(`
        SELECT EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'JobAssignmentMode'
        ) as exists
      `);
      
      if (enumCheck && enumCheck[0] && enumCheck[0].exists) {
        // Check if columns exist
        const columnCheck = await prisma.$queryRawUnsafe(`
          SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Company' AND column_name = 'job_assignment_mode'
          ) as exists
        `);
        
        if (columnCheck && columnCheck[0] && columnCheck[0].exists) {
          migrationAlreadyApplied = true;
          console.log('  ✅ Migration changes are already applied in the database\n');
        }
      }
    } catch (checkError) {
      console.log('  ⚠️  Could not verify if migration is applied, marking as rolled back\n');
    }

    // Mark migrations based on whether they're already applied
    for (const failedMigration of failedMigrations) {
      const escapedName = failedMigration.migration_name.replace(/'/g, "''");
      
      if (migrationAlreadyApplied) {
        // Mark as successfully completed since changes are already in DB
        console.log(`Marking ${failedMigration.migration_name} as completed (changes already exist)...`);
        await prisma.$executeRawUnsafe(`
          UPDATE "_prisma_migrations"
          SET finished_at = NOW(),
              rolled_back_at = NULL
          WHERE migration_name = '${escapedName}'
          AND finished_at IS NULL
        `);
        console.log(`  ✅ Marked ${failedMigration.migration_name} as completed\n`);
      } else {
        // Mark as rolled back if changes don't exist
        console.log(`Marking ${failedMigration.migration_name} as rolled back...`);
        await prisma.$executeRawUnsafe(`
          UPDATE "_prisma_migrations"
          SET rolled_back_at = NOW()
          WHERE migration_name = '${escapedName}'
          AND finished_at IS NULL
        `);
        console.log(`  ✅ Marked ${failedMigration.migration_name} as rolled back\n`);
      }
    }

    console.log('✅ Migration resolution complete.\n');
    console.log('You can now run: pnpm run db:deploy\n');

  } catch (error) {
    // If the error is about table not existing, that's okay - migrations haven't run yet
    if (error.message?.includes('does not exist') || error.message?.includes('relation "_prisma_migrations"')) {
      console.log('ℹ️  Migration table does not exist yet. This is normal for a fresh database.\n');
      return;
    }
    console.error('⚠️  Error resolving migration (continuing anyway):', error.message);
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
