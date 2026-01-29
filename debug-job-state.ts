
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const jobId = '928d043d-f337-45c2-a957-12f9ce44aaa0';

async function main() {
    console.log(`Inspecting Job: ${jobId}`);

    const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
            job_round: true,
            applications: {
                include: {
                    candidate: true,
                    application_round_progress: {
                        include: {
                            job_round: true
                        }
                    }
                }
            }
        }
    });

    if (!job) {
        console.log('Job not found');
        return;
    }

    console.log('--- Job Rounds ---');
    job.job_round.forEach(r => {
        console.log(`ID: ${r.id}, Name: ${r.name}, Type: ${r.type}, UpdatedAt: ${r.updated_at.toISOString()}`);
    });

    console.log('\n--- Applications & Progress ---');
    job.applications.forEach(app => {
        console.log(`Candidate: ${app.candidate.firstName} ${app.candidate.lastName} (${app.id})`);
        if (app.application_round_progress.length === 0) {
            console.log('  No progress records.');
        } else {
            app.application_round_progress.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
            app.application_round_progress.forEach(p => {
                console.log(`  Round: ${p.job_round.name} (${p.job_round_id})`);
                console.log(`    ProgressID: ${p.id}`);
                console.log(`    UpdatedAt: ${p.updated_at.toISOString()}`);
            });
        }
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
