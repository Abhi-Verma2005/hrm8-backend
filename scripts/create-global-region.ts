/**
 * Create Default Global Region Script
 * Creates a default "Global" region (HRM8-owned) and assigns existing companies/jobs to it
 */

import { PrismaClient, RegionOwnerType } from '@prisma/client';
import prisma from '../src/lib/prisma';

async function createGlobalRegion() {
  try {
    console.log('🌍 Creating Global region...');

    // Check if Global region already exists
    const existingGlobalRegion = await prisma.region.findFirst({
      where: { code: 'GLOBAL' },
    });

    let globalRegion;

    if (existingGlobalRegion) {
      console.log('✅ Global region already exists:', existingGlobalRegion.id);
      globalRegion = existingGlobalRegion;
    } else {
      // Create Global region
      globalRegion = await prisma.region.create({
        data: {
          name: 'Global',
          code: 'GLOBAL',
          country: 'All',
          ownerType: RegionOwnerType.HRM8,
          isActive: true,
        },
      });
      console.log('✅ Created Global region:', globalRegion.id);
    }

    // Assign all companies without regionId to Global region
    const companiesWithoutRegion = await prisma.company.updateMany({
      where: {
        regionId: null,
      },
      data: {
        regionId: globalRegion.id,
      },
    });
    console.log(`✅ Assigned ${companiesWithoutRegion.count} companies to Global region`);

    // Assign all jobs without regionId to Global region
    const jobsWithoutRegion = await prisma.job.updateMany({
      where: {
        regionId: null,
      },
      data: {
        regionId: globalRegion.id,
      },
    });
    console.log(`✅ Assigned ${jobsWithoutRegion.count} jobs to Global region`);

    // Assign all consultants without regionId to Global region
    const consultantsWithoutRegion = await prisma.consultant.updateMany({
      where: {
        regionId: null,
      },
      data: {
        regionId: globalRegion.id,
      },
    });
    console.log(`✅ Assigned ${consultantsWithoutRegion.count} consultants to Global region`);

    console.log('🎉 Global region setup complete!');
    console.log(`   Region ID: ${globalRegion.id}`);
    console.log(`   Companies assigned: ${companiesWithoutRegion.count}`);
    console.log(`   Jobs assigned: ${jobsWithoutRegion.count}`);
    console.log(`   Consultants assigned: ${consultantsWithoutRegion.count}`);
  } catch (error) {
    console.error('❌ Error creating Global region:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
createGlobalRegion()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });



