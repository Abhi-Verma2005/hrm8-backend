/**
 * Reusable DB Query Template
 * 
 * This file can be edited to run custom database queries.
 * Usage: cd backend && npx ts-node test-scripts/db-query-template.ts
 * 
 * Edit the query function below to customize your query.
 */

import { randomUUID } from 'crypto';
import { prisma } from '../src/lib/prisma';

async function runQuery() {
  try {
    console.log('\n🔧 Upgrading the first company to a paid subscription (payg)...\n');
    console.log('─'.repeat(70));

    // Find the first company
    const company = await prisma.company.findFirst({
      select: { id: true, name: true, domain: true },
    });

    if (!company) {
      console.log('❌ No company found in the database.');
      return;
    }

    console.log(`Found company: ${company.name} (${company.domain}) [${company.id}]`);

    // Fetch existing profile data (if any)
    const profile = await prisma.companyProfile.findUnique({
      where: { companyId: company.id },
      select: { profileData: true },
    });

    const existingProfileData = (profile?.profileData as any) ?? {};
    const updatedProfileData = {
      ...existingProfileData,
      billing: {
        ...(existingProfileData.billing ?? {}),
        subscriptionTier: 'payg',
      },
      // Also set at root level for compatibility
      subscriptionTier: 'payg',
    };

    const result = await prisma.companyProfile.upsert({
      where: { companyId: company.id },
      create: {
        id: randomUUID(),
        companyId: company.id,
        profileData: updatedProfileData,
      },
      update: {
        profileData: updatedProfileData,
      },
      select: {
        companyId: true,
        profileData: true,
      },
    });

    console.log('\n✅ Updated subscription tier to "payg"');
    console.log(JSON.stringify(result, null, 2));

    console.log('\n' + '─'.repeat(70));
    console.log('\n✅ Query complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the query
runQuery()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

