/**
 * RBAC Migration Script
 * Migrates from old role system (COMPANY_ADMIN, EMPLOYEE) to new system (SUPER_ADMIN, ADMIN, USER, VISITOR)
 * 
 * Run with: npx ts-node scripts/migrate-rbac.ts
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const prisma = new PrismaClient();

async function migrateRBAC() {
  console.log('🚀 Starting RBAC migration...\n');

  try {
    // Step 1: Check if we need to migrate (check if old enum values exist)
    console.log('📊 Checking current database state...');
    
    const oldAdminCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "User" WHERE role = 'COMPANY_ADMIN'
    `.catch(() => [{ count: BigInt(0) }]);

    const oldEmployeeCount = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) as count FROM "User" WHERE role = 'EMPLOYEE'
    `.catch(() => [{ count: BigInt(0) }]);

    const hasOldRoles = Number(oldAdminCount[0]?.count || 0) > 0 || Number(oldEmployeeCount[0]?.count || 0) > 0;

    if (!hasOldRoles) {
      console.log('✅ No old role values found. Database may already be migrated or empty.\n');
      console.log('📦 Proceeding with schema push...\n');
      
      // Just push the schema
      execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
      execSync('npx prisma generate', { stdio: 'inherit' });
      
      console.log('\n✅ Migration complete!');
      return;
    }

    console.log(`Found ${oldAdminCount[0]?.count || 0} COMPANY_ADMIN users`);
    console.log(`Found ${oldEmployeeCount[0]?.count || 0} EMPLOYEE users\n`);

    // Step 2: Add new enum values to existing enum (if they don't exist)
    console.log('🔧 Adding new enum values...');
    
    try {
      await prisma.$executeRaw`
        ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
      `;
      await prisma.$executeRaw`
        ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'ADMIN';
      `;
      await prisma.$executeRaw`
        ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'USER';
      `;
      await prisma.$executeRaw`
        ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'VISITOR';
      `;
      console.log('✅ New enum values added\n');
    } catch (error: any) {
      // If enum values already exist, that's fine
      if (error.message?.includes('already exists')) {
        console.log('✅ Enum values already exist\n');
      } else {
        throw error;
      }
    }

    // Step 3: Migrate data
    console.log('🔄 Migrating user roles...');
    
    // Update COMPANY_ADMIN to SUPER_ADMIN
    // Use explicit cast to the enum type
    const adminUpdateResult = await prisma.$executeRawUnsafe(`
      UPDATE "User" 
      SET role = 'SUPER_ADMIN'::"UserRole"
      WHERE role::text = 'COMPANY_ADMIN'
    `);
    console.log(`✅ Updated ${adminUpdateResult} users from COMPANY_ADMIN to SUPER_ADMIN`);

    // Update EMPLOYEE to USER
    const employeeUpdateResult = await prisma.$executeRawUnsafe(`
      UPDATE "User" 
      SET role = 'USER'::"UserRole"
      WHERE role::text = 'EMPLOYEE'
    `);
    console.log(`✅ Updated ${employeeUpdateResult} users from EMPLOYEE to USER`);

    // Verify migration
    const verifyAdmin = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM "User" WHERE role::text = 'COMPANY_ADMIN'`
    ).catch(() => [{ count: BigInt(0) }]);
    
    const verifyEmployee = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM "User" WHERE role::text = 'EMPLOYEE'`
    ).catch(() => [{ count: BigInt(0) }]);

    if (Number(verifyAdmin[0]?.count || 0) > 0 || Number(verifyEmployee[0]?.count || 0) > 0) {
      throw new Error(
        `Migration incomplete: ${verifyAdmin[0]?.count || 0} COMPANY_ADMIN and ${verifyEmployee[0]?.count || 0} EMPLOYEE users still exist`
      );
    }
    console.log('✅ Verified: All users migrated successfully\n');

    // Step 4: Remove old enum values manually (Prisma can't do this if values are still in use)
    console.log('🔧 Removing old enum values...');
    
    // Remove old enum values by recreating the enum
    // Since we've already migrated all data, we can safely recreate the enum
    console.log('   Recreating enum with only new values...');
    
    try {
      // Create a new enum with only the new values
      await prisma.$executeRawUnsafe(`
        CREATE TYPE "UserRole_new" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER', 'VISITOR');
      `);
      
      // Update the column to use the new enum
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" 
        ALTER COLUMN role TYPE "UserRole_new" 
        USING role::text::"UserRole_new";
      `);
      
      // Drop the old enum
      await prisma.$executeRawUnsafe(`
        DROP TYPE "UserRole";
      `);
      
      // Rename the new enum to the original name
      await prisma.$executeRawUnsafe(`
        ALTER TYPE "UserRole_new" RENAME TO "UserRole";
      `);
      
      console.log('✅ Old enum values removed\n');
    } catch (error: any) {
      if (error.message?.includes('already exists') || error.message?.includes('does not exist')) {
        console.log('   Enum migration already completed or in progress\n');
      } else {
        console.error('   Error during enum recreation:', error.message);
        throw error;
      }
    }

    // Step 5: Remove isCompanyAdmin column
    console.log('🔧 Removing isCompanyAdmin column...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" DROP COLUMN IF EXISTS "is_company_admin";
      `);
      console.log('✅ isCompanyAdmin column removed\n');
    } catch (error: any) {
      console.log('   Column removal handled by schema push\n');
    }

    // Step 6: Push remaining schema changes (Job model, etc.)
    console.log('📦 Pushing remaining schema changes...\n');
    execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });

    // Step 6: Regenerate Prisma Client
    console.log('\n🔨 Regenerating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    console.log('\n✅ Migration complete!');
    console.log('\n📋 Summary:');
    console.log(`   - Migrated ${adminUpdateResult} users to SUPER_ADMIN`);
    console.log(`   - Migrated ${employeeUpdateResult} users to USER`);
    console.log('   - Schema updated with new RBAC system');
    console.log('   - Prisma Client regenerated');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateRBAC()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration error:', error);
    process.exit(1);
  });

