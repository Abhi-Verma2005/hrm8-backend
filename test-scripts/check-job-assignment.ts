/**
 * Script to check job assignment status
 * Usage: npx ts-node test-scripts/check-job-assignment.ts <jobId>
 */

import { JobModel } from '../src/models/Job';
import { ConsultantModel } from '../src/models/Consultant';
import { ConsultantJobAssignmentModel } from '../src/models/ConsultantJobAssignment';
import { CompanyModel } from '../src/models/Company';

async function checkJobAssignment(jobId: string) {
  try {
    console.log('\n🔍 Checking Job Assignment Status...\n');
    console.log('Job ID:', jobId);
    console.log('─'.repeat(50));

    // 1. Get job details
    const job = await JobModel.findById(jobId);
    if (!job) {
      console.error('❌ Job not found!');
      return;
    }

    console.log('\n📋 Job Details:');
    console.log('  Title:', job.title);
    console.log('  Status:', job.status);
    console.log('  Region ID:', job.regionId || '❌ NOT SET (required for auto-assignment)');
    console.log('  Assignment Mode:', job.assignmentMode || 'Not set');
    console.log('  Assignment Source:', job.assignmentSource || 'Not set');
    console.log('  Assigned Consultant ID:', job.assignedConsultantId || '❌ NOT ASSIGNED');

    // 2. Get company details
    const company = await CompanyModel.findById(job.companyId);
    if (company) {
      const companyData = await require('../src/lib/prisma').default.company.findUnique({
        where: { id: job.companyId },
        select: { jobAssignmentMode: true },
      });
      console.log('\n🏢 Company Settings:');
      console.log('  Company ID:', job.companyId);
      console.log('  Job Assignment Mode:', companyData?.jobAssignmentMode || 'Not set');
    }

    // 3. Check assignments
    const assignments = await ConsultantJobAssignmentModel.findByJobId(jobId, false);
    console.log('\n👥 Assignments:');
    if (assignments.length === 0) {
      console.log('  ❌ No assignments found');
    } else {
      for (const assignment of assignments) {
        console.log('  ✅ Assignment ID:', assignment.id);
        console.log('     Consultant ID:', assignment.consultantId);
        console.log('     Status:', assignment.status);
        console.log('     Source:', assignment.assignmentSource || 'Not set');
        console.log('     Assigned At:', assignment.assignedAt);
        console.log('     Assigned By:', assignment.assignedBy || 'System');
      }
    }

    // 4. Check consultant details if assigned
    if (job.assignedConsultantId) {
      const consultant = await ConsultantModel.findById(job.assignedConsultantId);
      if (consultant) {
        console.log('\n👤 Assigned Consultant:');
        console.log('  Name:', `${consultant.firstName} ${consultant.lastName}`);
        console.log('  Email:', consultant.email);
        console.log('  Role:', consultant.role);
        console.log('  Status:', consultant.status);
        console.log('  Availability:', consultant.availability);
        console.log('  Region ID:', consultant.regionId || '❌ NOT SET');
        console.log('  Current Jobs:', consultant.currentJobs);
        console.log('  Max Jobs:', consultant.maxJobs);
        console.log('  Capacity:', consultant.currentJobs < consultant.maxJobs ? '✅ Available' : '❌ At Capacity');
      } else {
        console.log('\n⚠️  Assigned consultant ID exists but consultant not found!');
      }
    }

    // 5. Check if region matches
    if (job.regionId) {
      const consultantsInRegion = await ConsultantModel.findAll({
        regionId: job.regionId,
        status: 'ACTIVE',
      });
      console.log('\n🌍 Consultants in Job Region:');
      console.log('  Region ID:', job.regionId);
      console.log('  Total Active Consultants:', consultantsInRegion.length);
      
      if (consultantsInRegion.length === 0) {
        console.log('  ⚠️  No active consultants found in this region!');
      } else {
        console.log('\n  Eligible Consultants:');
        for (const consultant of consultantsInRegion) {
          const isEligible = 
            (consultant.role === 'RECRUITER' || consultant.role === 'CONSULTANT_360') &&
            consultant.availability !== 'AT_CAPACITY' &&
            consultant.currentJobs < consultant.maxJobs;
          
          console.log(`  ${isEligible ? '✅' : '❌'} ${consultant.firstName} ${consultant.lastName}`);
          console.log(`     Role: ${consultant.role}`);
          console.log(`     Availability: ${consultant.availability}`);
          console.log(`     Jobs: ${consultant.currentJobs}/${consultant.maxJobs}`);
          if (!isEligible) {
            if (consultant.role !== 'RECRUITER' && consultant.role !== 'CONSULTANT_360') {
              console.log('     ❌ Wrong role (must be RECRUITER or CONSULTANT_360)');
            }
            if (consultant.availability === 'AT_CAPACITY') {
              console.log('     ❌ At capacity');
            }
            if (consultant.currentJobs >= consultant.maxJobs) {
              console.log('     ❌ No capacity (currentJobs >= maxJobs)');
            }
          }
        }
      }
    } else {
      console.log('\n⚠️  Job has no regionId - auto-assignment cannot work!');
    }

    console.log('\n' + '─'.repeat(50));
    console.log('\n✅ Check complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Get job ID from command line
const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: npx ts-node test-scripts/check-job-assignment.ts <jobId>');
  process.exit(1);
}

checkJobAssignment(jobId)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




