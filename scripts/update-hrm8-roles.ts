/**
 * Update HRM8 User Roles Script
 * 
 * This script updates HRM8 user roles:
 * - Sets rdxomega email to GLOBAL_ADMIN
 * - Sets all other users to REGIONAL_LICENSEE
 * 
 * Usage: pnpm ts-node scripts/update-hrm8-roles.ts
 * 
 * IMPORTANT: Before running this script, ensure:
 * 1. The HRM8User model exists in schema.prisma
 * 2. The database migration has been run
 * 3. The Prisma client has been generated
 */

import { PrismaClient, HRM8UserRole } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env' });

const prisma = new PrismaClient();

// Email pattern for global admin (case-insensitive)
const GLOBAL_ADMIN_EMAIL_PATTERN = 'rdxomega';

async function updateHrm8Roles() {
  try {
    console.log('🔄 Updating HRM8 user roles...\n');

    // Get all HRM8 users
    const allUsers = await prisma.hRM8User.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (allUsers.length === 0) {
      console.log('⚠️  No HRM8 users found in database.');
      return;
    }

    console.log(`📊 Found ${allUsers.length} HRM8 user(s)\n`);

    let globalAdminUpdated = 0;
    let licenseeUpdated = 0;
    let unchanged = 0;

    for (const user of allUsers) {
      const emailLower = user.email.toLowerCase();
      const shouldBeGlobalAdmin = emailLower.includes(GLOBAL_ADMIN_EMAIL_PATTERN);
      const targetRole = shouldBeGlobalAdmin 
        ? HRM8UserRole.GLOBAL_ADMIN 
        : HRM8UserRole.REGIONAL_LICENSEE;

      // Skip if role is already correct
      if (user.role === targetRole) {
        console.log(`✓ ${user.email} - Already ${targetRole} (no change)`);
        unchanged++;
        continue;
      }

      // Update user role
      await prisma.hRM8User.update({
        where: { id: user.id },
        data: { role: targetRole },
      });

      if (shouldBeGlobalAdmin) {
        console.log(`🔑 ${user.email} - Updated to GLOBAL_ADMIN`);
        globalAdminUpdated++;
      } else {
        console.log(`👤 ${user.email} - Updated to REGIONAL_LICENSEE`);
        licenseeUpdated++;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Role update completed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Total users: ${allUsers.length}`);
    console.log(`   Global Admins updated: ${globalAdminUpdated}`);
    console.log(`   Licensees updated: ${licenseeUpdated}`);
    console.log(`   Unchanged: ${unchanged}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // Show final role distribution
    const finalStats = await prisma.hRM8User.groupBy({
      by: ['role'],
      _count: true,
    });

    console.log('📈 Final role distribution:');
    finalStats.forEach((stat) => {
      console.log(`   ${stat.role}: ${stat._count} user(s)`);
    });
    console.log('');

  } catch (error: any) {
    if (error.code === 'P1001') {
      console.error('❌ Error: Cannot connect to database!');
      console.error('   Please check your DATABASE_URL environment variable');
    } else if (error.message?.includes('does not exist')) {
      console.error('❌ Error: HRM8User model does not exist in database!');
      console.error('   Please run: pnpm prisma migrate dev');
      console.error('   Then: pnpm prisma generate');
    } else {
      console.error('❌ Error updating HRM8 roles:', error.message);
      console.error('   Full error:', error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
updateHrm8Roles();






















