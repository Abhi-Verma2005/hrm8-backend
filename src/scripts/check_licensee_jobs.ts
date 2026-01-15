
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLicenseeJobs() {
    const licenseeId = '3dd93005-512a-44ac-95b6-a1ab23a74382';
    const licenseeEmail = 'koen@koenigsegg.com';

    console.log(`Checking unassigned jobs for Licensee: ${licenseeEmail} (${licenseeId})`);

    try {
        // 1. Find Regions assigned to this Licensee
        const regions = await prisma.region.findMany({
            where: {
                licensee_id: licenseeId,
                is_active: true
            },
            select: { id: true, name: true, code: true }
        });

        console.log(`Found ${regions.length} active regions for this licensee:`);
        regions.forEach(r => console.log(` - ${r.name} (${r.code}) [ID: ${r.id}]`));

        if (regions.length === 0) {
            console.log('No regions assigned. Consequently, no jobs can be visible.');
            return;
        }

        const regionIds = regions.map(r => r.id);

        // 2. Find Unassigned Jobs in these regions
        const unassignedJobs = await prisma.job.findMany({
            where: {
                region_id: { in: regionIds },
                assigned_consultant_id: null,
                status: 'OPEN' // Assuming we only care about OPEN jobs
            },
            select: {
                id: true,
                title: true,
                company: { select: { name: true } },
                region_id: true,
                created_at: true
            }
        });

        console.log(`\nFound ${unassignedJobs.length} UNASSIGNED jobs in these regions:`);
        unassignedJobs.forEach(job => {
            const regionName = regions.find(r => r.id === job.region_id)?.name;
            console.log(` - [${job.id}] "${job.title}" at ${job.company.name} (Region: ${regionName})`);
        });

    } catch (error) {
        console.error('Error querying database:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkLicenseeJobs();
