/**
 * Force RBAC Migration Script
 * Forcefully migrates schema - use only if you have minimal/no important data
 * 
 * Run with: npx ts-node scripts/force-migrate-rbac.ts
 */

import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const prisma = new PrismaClient();

async function forceMigrateRBAC() {
  console.log('🚀 Starting FORCE RBAC migration...\n');
  console.log('⚠️  WARNING: This will forcefully update the schema. Make sure you have backups!\n');

  try {
    // Step 1: Update any existing users to new roles (if any exist)
    console.log('📊 Checking and updating existing users...');
    
    try {
      // Try to update existing users - if enum values don't exist yet, this will fail but that's ok
      await prisma.$executeRawUnsafe(`
        UPDATE "User" 
        SET role = 'SUPER_ADMIN'::text
        WHERE role::text = 'COMPANY_ADMIN'
      `).catch(() => {
        console.log('   (Skipping COMPANY_ADMIN update - enum may not exist yet)');
      });

      await prisma.$executeRawUnsafe(`
        UPDATE "User" 
        SET role = 'USER'::text
        WHERE role::text = 'EMPLOYEE'
      `).catch(() => {
        console.log('   (Skipping EMPLOYEE update - enum may not exist yet)');
      });
    } catch (error) {
      console.log('   (User updates skipped - will handle after enum recreation)');
    }

    // Step 2: Drop and recreate the enum forcefully
    console.log('🔧 Forcefully recreating UserRole enum...');
    
    try {
      // Convert all columns that use UserRole enum to text temporarily
      console.log('   Converting User.role to text...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" ALTER COLUMN role TYPE text;
      `);
      
      console.log('   Converting Session.user_role to text...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Session" ALTER COLUMN user_role TYPE text;
      `);
      
      // Drop the old enum
      console.log('   Dropping old UserRole enum...');
      await prisma.$executeRawUnsafe(`
        DROP TYPE IF EXISTS "UserRole";
      `);
      
      // Create new enum with only new values
      console.log('   Creating new UserRole enum...');
      await prisma.$executeRawUnsafe(`
        CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'USER', 'VISITOR');
      `);
      
      // Update any existing text values to new enum values in User table
      console.log('   Updating User table data...');
      await prisma.$executeRawUnsafe(`
        UPDATE "User" 
        SET role = CASE 
          WHEN role = 'COMPANY_ADMIN' THEN 'SUPER_ADMIN'
          WHEN role = 'EMPLOYEE' THEN 'USER'
          WHEN role NOT IN ('SUPER_ADMIN', 'ADMIN', 'USER', 'VISITOR') THEN 'USER'
          ELSE role
        END
      `);
      
      // Update Session table data
      console.log('   Updating Session table data...');
      await prisma.$executeRawUnsafe(`
        UPDATE "Session" 
        SET user_role = CASE 
          WHEN user_role = 'COMPANY_ADMIN' THEN 'SUPER_ADMIN'
          WHEN user_role = 'EMPLOYEE' THEN 'USER'
          WHEN user_role NOT IN ('SUPER_ADMIN', 'ADMIN', 'USER', 'VISITOR') THEN 'USER'
          ELSE user_role
        END
      `);
      
      // Change columns back to enum type
      console.log('   Converting User.role back to enum...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" ALTER COLUMN role TYPE "UserRole" USING role::"UserRole";
      `);
      
      console.log('   Converting Session.user_role back to enum...');
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Session" ALTER COLUMN user_role TYPE "UserRole" USING user_role::"UserRole";
      `);
      
      console.log('✅ UserRole enum recreated\n');
    } catch (error: any) {
      console.error('   Error recreating enum:', error.message);
      throw error;
    }

    // Step 3: Remove isCompanyAdmin column
    console.log('🔧 Removing isCompanyAdmin column...');
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "User" DROP COLUMN IF EXISTS "is_company_admin";
      `);
      console.log('✅ isCompanyAdmin column removed\n');
    } catch (error: any) {
      console.log('   (Column may not exist or already removed)\n');
    }

    // Step 4: Push remaining schema changes (Job model, etc.)
    console.log('📦 Pushing remaining schema changes (Job model, etc.)...\n');
    execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });

    // Step 5: Regenerate Prisma Client
    console.log('\n🔨 Regenerating Prisma Client...');
    execSync('npx prisma generate', { stdio: 'inherit' });

    console.log('\n✅ Force migration complete!');
    console.log('\n📋 Summary:');
    console.log('   - UserRole enum recreated with new values');
    console.log('   - Existing users migrated (COMPANY_ADMIN → SUPER_ADMIN, EMPLOYEE → USER)');
    console.log('   - isCompanyAdmin column removed');
    console.log('   - Schema updated with Job model and new RBAC system');
    console.log('   - Prisma Client regenerated');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
forceMigrateRBAC()
  .then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration error:', error);
    process.exit(1);
  });

