/**
 * Reusable DB Query Template
 * 
 * This file can be edited to run custom database queries.
 * Usage: cd backend && npx ts-node test-scripts/db-query-template.ts
 * 
 * Edit the query function below to customize your query.
 */

import { prisma } from '../src/lib/prisma';

async function runQuery() {
  try {
    console.log('\n🔍 Checking consultants and regions for assignment drawer...\n');
    console.log('─'.repeat(70));

    // ============================================
    // EDIT THIS SECTION TO CUSTOMIZE YOUR QUERY
    // ============================================

    // 1) Inspect consultants (name/email contains "raj") and their regions/availability
    const rajConsultants = await prisma.consultant.findMany({
      where: {
        OR: [
          { firstName: { contains: 'raj', mode: 'insensitive' } },
          { lastName: { contains: 'raj', mode: 'insensitive' } },
          { email: { contains: 'raj', mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        regionId: true,
        status: true,
        availability: true,
        currentJobs: true,
        maxJobs: true,
      },
    });

    console.log('\nConsultants matching "raj":');
    if (rajConsultants.length === 0) {
      console.log('  ❌ None found');
    } else {
      rajConsultants.forEach((c) => {
        const workload =
          c.maxJobs && c.maxJobs > 0 ? `${c.currentJobs}/${c.maxJobs} (${Math.round((c.currentJobs / c.maxJobs) * 100)}%)` : 'n/a';
        console.log(
          `  - ${c.firstName} ${c.lastName} (${c.email}) | region=${c.regionId} | status=${c.status} | availability=${c.availability} | workload=${workload}`
        );
      });
    }

    // 2) Sample of consultants by region to confirm availability
    const consultantCountsByRegion = await prisma.consultant.groupBy({
      by: ['regionId'],
      _count: { id: true },
    });
    console.log('\nConsultant counts by region:');
    consultantCountsByRegion.forEach((r) => {
      console.log(`  - region=${r.regionId ?? 'null'} -> consultants=${r._count.id}`);
    });

    // 3) Latest OPEN/ON_HOLD jobs and their regions to verify filter alignment
    const recentJobs = await prisma.job.findMany({
      where: {
        status: { in: ['OPEN', 'ON_HOLD'] },
      },
      select: {
        id: true,
        title: true,
        status: true,
        regionId: true,
        companyId: true,
        assignmentMode: true,
        assignedConsultantId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    console.log('\nRecent OPEN/ON_HOLD jobs (top 5):');
    if (recentJobs.length === 0) {
      console.log('  ❌ None found');
    } else {
      for (const job of recentJobs) {
        const company = await prisma.company.findUnique({
          where: { id: job.companyId },
          select: { name: true, regionId: true },
        });
        console.log(
          `  - ${job.title} (${job.id}) | status=${job.status} | jobRegion=${job.regionId ?? 'null'} | companyRegion=${
            company?.regionId ?? 'null'
          } | assigned=${job.assignedConsultantId ?? 'none'} | mode=${job.assignmentMode}`
        );
      }
    }

    // ============================================
    // END OF CUSTOMIZABLE SECTION
    // ============================================

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

