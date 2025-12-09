/**
 * Manual Job Alert Trigger Script
 * Run this to manually process alerts for an existing job
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function triggerAlertsForJob(jobId: string) {
    try {
        // Get the job
        const job = await prisma.job.findUnique({
            where: { id: jobId },
            include: {
                company: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (!job) {
            console.error('❌ Job not found');
            return;
        }

        console.log('📋 Job found:', {
            id: job.id,
            title: job.title,
            workArrangement: job.workArrangement,
            location: job.location,
            category: job.category,
            status: job.status
        });

        // Import and call the alert processing
        const { CandidateJobService } = await import('./src/services/candidate/CandidateJobService');

        console.log('\n🔔 Triggering alert processing...\n');
        await CandidateJobService.processJobAlerts(job);

        console.log('\n✅ Alert processing complete!');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Get job ID from command line or use a default
const jobId = process.argv[2];

if (!jobId) {
    console.error('Usage: ts-node trigger-alerts.ts <job-id>');
    console.log('\nTo find a job ID, run:');
    console.log('  npx prisma studio');
    console.log('  Or check your jobs table in the database');
    process.exit(1);
}

triggerAlertsForJob(jobId);
