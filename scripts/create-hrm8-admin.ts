/**
 * Script to create HRM8 Global Admin user
 * 
 * Usage: pnpm ts-node scripts/create-hrm8-admin.ts
 * 
 * This script creates a global HRM8 admin user in the database.
 * 
 * IMPORTANT: Before running this script, ensure:
 * 1. The HRM8User model exists in schema.prisma
 * 2. The database migration has been run
 * 3. The Prisma client has been generated
 */

import { PrismaClient, HRM8UserRole, HRM8UserStatus } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

interface CreateHrm8AdminParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

async function createHrm8Admin({
  email,
  password,
  firstName,
  lastName,
}: CreateHrm8AdminParams) {
  try {
    console.log('🔐 Creating HRM8 Global Admin user...');
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${firstName} ${lastName}`);

    // Check if user already exists
    const existingUser = await prisma.hRM8User.findUnique({
      where: { email },
    });

    if (existingUser) {
      console.log('⚠️  User with this email already exists!');
      console.log(`   User ID: ${existingUser.id}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log(`   Status: ${existingUser.status}`);
      
      const update = process.argv.includes('--update');
      if (!update) {
        console.log('\n💡 To update the existing user, run with --update flag');
        return;
      }
      
      console.log('\n🔄 Updating existing user...');
      const passwordHash = await hashPassword(password);
      
      const updated = await prisma.hRM8User.update({
        where: { email },
        data: {
          firstName,
          lastName,
          passwordHash,
          role: HRM8UserRole.GLOBAL_ADMIN,
          status: HRM8UserStatus.ACTIVE,
        },
      });
      
      console.log('✅ User updated successfully!');
      console.log(`   User ID: ${updated.id}`);
      return;
    }

    // Hash password
    console.log('🔒 Hashing password...');
    const passwordHash = await hashPassword(password);

    // Create HRM8 user
    console.log('📝 Creating user in database...');
    const hrm8User = await prisma.hRM8User.create({
      data: {
        email: email.toLowerCase().trim(),
        firstName,
        lastName,
        passwordHash,
        role: HRM8UserRole.GLOBAL_ADMIN,
        status: HRM8UserStatus.ACTIVE,
      },
    });

    console.log('\n✅ HRM8 Global Admin created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   User ID: ${hrm8User.id}`);
    console.log(`   Email: ${hrm8User.email}`);
    console.log(`   Name: ${hrm8User.firstName} ${hrm8User.lastName}`);
    console.log(`   Role: ${hrm8User.role}`);
    console.log(`   Status: ${hrm8User.status}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎉 You can now login at /hrm8/login');
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.error('❌ Error: User with this email already exists!');
      console.error('   Run with --update flag to update existing user');
    } else if (error.code === 'P1001') {
      console.error('❌ Error: Cannot connect to database!');
      console.error('   Please check your DATABASE_URL environment variable');
    } else if (error.message?.includes('does not exist')) {
      console.error('❌ Error: HRM8User model does not exist in database!');
      console.error('   Please run: pnpm prisma migrate dev');
      console.error('   Then: pnpm prisma generate');
    } else {
      console.error('❌ Error creating HRM8 admin:', error.message);
      console.error('   Full error:', error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const email = process.env.HRM8_ADMIN_EMAIL || 'rdx.omega2678@gmail.com';
const password = process.env.HRM8_ADMIN_PASSWORD || 'vAbhi2678';
const firstName = process.env.HRM8_ADMIN_FIRST_NAME || 'HRM8';
const lastName = process.env.HRM8_ADMIN_LAST_NAME || 'Admin';

// Allow override via command line args
const args = process.argv.slice(2);
const emailArg = args.find(arg => arg.startsWith('--email='))?.split('=')[1];
const passwordArg = args.find(arg => arg.startsWith('--password='))?.split('=')[1];
const firstNameArg = args.find(arg => arg.startsWith('--firstName='))?.split('=')[1];
const lastNameArg = args.find(arg => arg.startsWith('--lastName='))?.split('=')[1];

createHrm8Admin({
  email: emailArg || email,
  password: passwordArg || password,
  firstName: firstNameArg || firstName,
  lastName: lastNameArg || lastName,
});

