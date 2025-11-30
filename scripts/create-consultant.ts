/**
 * Script to create Consultant user
 * 
 * Usage: pnpm ts-node scripts/create-consultant.ts
 * 
 * This script creates a consultant user in the database.
 * 
 * IMPORTANT: Before running this script, ensure:
 * 1. The Consultant model exists in schema.prisma
 * 2. The database migration has been run
 * 3. The Prisma client has been generated
 */

import { PrismaClient, ConsultantRole, ConsultantStatus } from '@prisma/client';
import { hashPassword } from '../src/utils/password';

const prisma = new PrismaClient();

interface CreateConsultantParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: ConsultantRole;
}

async function createConsultant({
  email,
  password,
  firstName,
  lastName,
  role = ConsultantRole.RECRUITER,
}: CreateConsultantParams) {
  try {
    console.log('🔐 Creating Consultant user...');
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Name: ${firstName} ${lastName}`);
    console.log(`🎭 Role: ${role}`);

    // Check if consultant already exists
    const existingConsultant = await prisma.consultant.findUnique({
      where: { email },
    });

    if (existingConsultant) {
      console.log('⚠️  Consultant with this email already exists!');
      console.log(`   Consultant ID: ${existingConsultant.id}`);
      console.log(`   Role: ${existingConsultant.role}`);
      console.log(`   Status: ${existingConsultant.status}`);
      
      const update = process.argv.includes('--update');
      if (!update) {
        console.log('\n💡 To update the existing consultant, run with --update flag');
        return;
      }
      
      console.log('\n🔄 Updating existing consultant...');
      const passwordHash = await hashPassword(password);
      
      const updated = await prisma.consultant.update({
        where: { email },
        data: {
          firstName,
          lastName,
          passwordHash,
          role,
          status: ConsultantStatus.ACTIVE,
        },
      });
      
      console.log('✅ Consultant updated successfully!');
      console.log(`   Consultant ID: ${updated.id}`);
      return;
    }

    // Hash password
    console.log('🔒 Hashing password...');
    const passwordHash = await hashPassword(password);

    // Try to find or create Global region to assign consultant
    let globalRegion = await prisma.region.findFirst({
      where: { code: 'GLOBAL' },
    });
    
    if (!globalRegion) {
      console.log('🌍 Global region not found, creating it...');
      const { RegionOwnerType } = await import('@prisma/client');
      globalRegion = await prisma.region.create({
        data: {
          name: 'Global',
          code: 'GLOBAL',
          country: 'All',
          ownerType: RegionOwnerType.HRM8,
          isActive: true,
        },
      });
      console.log(`✅ Created Global region: ${globalRegion.id}`);
    } else {
      console.log(`🌍 Found Global region: ${globalRegion.id}`);
    }

    // Create consultant
    console.log('📝 Creating consultant in database...');
    const consultantData = {
      email: email.toLowerCase().trim(),
      firstName,
      lastName,
      passwordHash,
      role,
      status: ConsultantStatus.ACTIVE,
      regionId: globalRegion.id, // Always assign to Global region
    };

    const consultant = await prisma.consultant.create({
      data: consultantData,
    });

    console.log('\n✅ Consultant created successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Consultant ID: ${consultant.id}`);
    console.log(`   Email: ${consultant.email}`);
    console.log(`   Name: ${consultant.firstName} ${consultant.lastName}`);
    console.log(`   Role: ${consultant.role}`);
    console.log(`   Status: ${consultant.status}`);
    if (consultant.regionId) {
      console.log(`   Region ID: ${consultant.regionId}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎉 You can now login at /consultant/login');
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.error('❌ Error: Consultant with this email already exists!');
      console.error('   Run with --update flag to update existing consultant');
    } else if (error.code === 'P1001') {
      console.error('❌ Error: Cannot connect to database!');
      console.error('   Please check your DATABASE_URL environment variable');
    } else if (error.message?.includes('does not exist')) {
      console.error('❌ Error: Consultant model does not exist in database!');
      console.error('   Please run: pnpm prisma migrate dev');
      console.error('   Then: pnpm prisma generate');
    } else {
      console.error('❌ Error creating consultant:', error.message);
      console.error('   Full error:', error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const email = process.env.CONSULTANT_EMAIL || 'anish2305@gmail.com';
const password = process.env.CONSULTANT_PASSWORD || 'anish2305@';
const firstName = process.env.CONSULTANT_FIRST_NAME || 'Anish';
const lastName = process.env.CONSULTANT_LAST_NAME || 'Consultant';
const role = (process.env.CONSULTANT_ROLE as ConsultantRole) || ConsultantRole.RECRUITER;

// Allow override via command line args
const args = process.argv.slice(2);
const emailArg = args.find(arg => arg.startsWith('--email='))?.split('=')[1];
const passwordArg = args.find(arg => arg.startsWith('--password='))?.split('=')[1];
const firstNameArg = args.find(arg => arg.startsWith('--firstName='))?.split('=')[1];
const lastNameArg = args.find(arg => arg.startsWith('--lastName='))?.split('=')[1];
const roleArg = args.find(arg => arg.startsWith('--role='))?.split('=')[1] as ConsultantRole | undefined;

createConsultant({
  email: emailArg || email,
  password: passwordArg || password,
  firstName: firstNameArg || firstName,
  lastName: lastNameArg || lastName,
  role: roleArg || role,
});

