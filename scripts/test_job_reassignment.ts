
import { JobAllocationService } from '../src/services/hrm8/JobAllocationService';
import { prisma } from '../src/lib/prisma';
import { JobStatus, ConsultantRole } from '@prisma/client';

async function testJobReassignment() {
    console.log('--- Starting Job Reassignment Test ---');

    // 1. Find a region
    const region = await prisma.region.findFirst();
    if (!region) { console.error('No region found'); return; }

    // 2. Create 2 Consultants in this region
    console.log('Creating consultants...');
    const c1 = await prisma.consultant.create({
        data: {
            email: `test-c1-${Date.now()}@test.com`,
            first_name: 'Old',
            last_name: 'Consultant',
            password_hash: 'hash',
            region_id: region.id,
            role: ConsultantRole.RECRUITER
        }
    });

    const c2 = await prisma.consultant.create({
        data: {
            email: `test-c2-${Date.now()}@test.com`,
            first_name: 'New',
            last_name: 'Consultant',
            password_hash: 'hash',
            region_id: region.id,
            role: ConsultantRole.RECRUITER
        }
    });

    // 3. Create a Job and Assign to C1
    console.log('Creating job assigned to C1...');
    const company = await prisma.company.findFirst();
    if (!company) throw new Error("No company found");

    const job = await prisma.job.create({
        data: {
            title: 'Test Reassign Job',
            company_id: company.id,
            created_by: (await prisma.user.findFirst())?.id || '',
            status: JobStatus.OPEN,
            region_id: region.id,
            location: 'Remote',
            description: 'Test Description',
            assigned_consultant_id: c1.id
        }
    });

    // Manually create assignment record as service usually does this
    await prisma.consultantJobAssignment.create({
        data: {
            consultant_id: c1.id,
            job_id: job.id,
            status: 'ACTIVE',
            assigned_by: 'test'
        }
    });

    // Update C1 counter
    await prisma.consultant.update({ where: { id: c1.id }, data: { current_jobs: 1 } });

    // 4. Reassign C1 -> C2
    console.log(`Reassigning jobs from ${c1.id} to ${c2.id}...`);
    // Use lazy import or direct service call if possible, but test script can import directly
    const result = await JobAllocationService.reassignConsultantJobs(c1.id, c2.id, 'TestScript');

    if (result.success) {
        console.log(`PASSED: Reassigned ${result.count} jobs.`);
        const updatedJob = await prisma.job.findUnique({ where: { id: job.id } });

        if (updatedJob?.assigned_consultant_id === c2.id) {
            console.log('PASSED: Job assigned_consultant_id updated.');
        } else {
            console.error('FAILED: Job assigned_consultant_id mismatch', updatedJob?.assigned_consultant_id);
        }

        const c1Final = await prisma.consultant.findUnique({ where: { id: c1.id } });
        const c2Final = await prisma.consultant.findUnique({ where: { id: c2.id } });

        if (c1Final?.current_jobs === 0 && c2Final?.current_jobs === 1) {
            console.log('PASSED: Consultant job counters updated correctly.');
        } else {
            console.error(`FAILED: Counters incorrect. C1: ${c1Final?.current_jobs}, C2: ${c2Final?.current_jobs}`);
        }

    } else {
        console.error('FAILED: Reassignment returned failure', result.error);
    }

    // Cleanup
    await prisma.job.delete({ where: { id: job.id } });
    await prisma.consultant.deleteMany({ where: { id: { in: [c1.id, c2.id] } } });
}

testJobReassignment()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
