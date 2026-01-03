
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPublicJobs() {
    try {
        const publicJobs = await prisma.job.findMany({
            where: {
                status: 'OPEN',
                visibility: 'public'
            },
            select: {
                id: true,
                title: true,
                company: true,
                location: true
            }
        });

        console.log(`Found ${publicJobs.length} public visible jobs:`);
        publicJobs.forEach(job => {
            console.log(`- ${job.title} at ${job.company} (${job.location})`);
        });

        const totalJobs = await prisma.job.count();
        console.log(`\nTotal jobs in database: ${totalJobs}`);

    } catch (error) {
        console.error('Error checking jobs:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkPublicJobs();
