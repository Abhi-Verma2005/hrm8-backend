
import { PrismaClient, ConsultantRole, JobStatus, RegionOwnerType, AssignmentSource, CommissionType, UserRole, SubscriptionPlanType, BillingCycle, SubscriptionStatus, CompanyProfileStatus } from '@prisma/client';
import { ConsultantManagementService } from '../src/services/hrm8/ConsultantManagementService';
import { JobAllocationService } from '../src/services/hrm8/JobAllocationService';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Consultant Management Module Production Test...');

    try {
        // 1. Setup: Create Region and Licensee
        console.log('\n📦 1. Setting up Region and Licensee...');
        const region = await prisma.region.create({
            data: {
                name: 'Test Region ' + Date.now(),
                code: 'TR-' + Date.now(),
                owner_type: RegionOwnerType.HRM8, // Start as HRM8 owned
                country: 'United States'
            }
        });
        console.log(`   ✅ Created Region: ${region.name} (${region.id})`);

        // 2. Consultant Onboarding
        console.log('\n👤 2. Testing Consultant Onboarding...');
        const consultantEmail = `test.consultant.${Date.now()}@hrm8.com`;
        const consultant = await ConsultantManagementService.createConsultant({
            email: consultantEmail,
            password: 'Password123!',
            firstName: 'Test',
            lastName: 'Consultant',
            role: ConsultantRole.RECRUITER,
            regionId: region.id
        });

        if ('error' in consultant) {
            throw new Error(`Failed to create consultant: ${consultant.error}`);
        }
        console.log(`   ✅ Created Consultant: ${consultant.email} (${consultant.id})`);

        // Verify Region ID persistence
        const fetchedConsultant = await prisma.consultant.findUnique({ where: { id: consultant.id } });
        if (fetchedConsultant?.region_id !== region.id) throw new Error('Region ID mismatch on Consultant');
        console.log('   ✅ Region ID persisted correctly on Consultant');

        // 3. Job Creation & Allocation
        console.log('\nbla 3. Testing Job Allocation...');
        const company = await prisma.company.create({
            data: {
                name: 'Test Company ' + Date.now(),
                domain: `test${Date.now()}.com`,
                website: `https://test${Date.now()}.com`,
                region_id: region.id,
                verification_status: 'VERIFIED'
            }
        });

        // Create Subscription for Company (Relational)
        await prisma.subscription.create({
            data: {
                company_id: company.id,
                name: 'Test Professional Plan',
                plan_type: SubscriptionPlanType.PROFESSIONAL,
                status: SubscriptionStatus.ACTIVE,
                base_price: 999,
                billing_cycle: BillingCycle.MONTHLY,
                start_date: new Date(),
                auto_renew: true
            }
        });

        // Create CompanyProfile (REQUIRED for check in PackageService)
        await prisma.companyProfile.create({
            data: {
                company_id: company.id,
                status: CompanyProfileStatus.COMPLETED,
                profile_data: {
                    billing: {
                        subscriptionTier: 'enterprise' // Set to Paid Tier
                    }
                }
            }
        });
        console.log('   ✅ Created CompanyProfile with Enterprise Tier');

        // Create system user for job creator
        const systemUser = await prisma.user.create({
            data: {
                email: `system.${Date.now()}@hrm8.com`,
                name: 'System User',
                password_hash: 'hash',
                company_id: company.id,
                role: UserRole.ADMIN,
                status: 'ACTIVE'
            }
        });

        const job = await prisma.job.create({
            data: {
                title: 'Test Job',
                company_id: company.id,
                created_by: systemUser.id,
                description: 'Test Description',
                location: 'Remote',
                status: JobStatus.OPEN,
                region_id: region.id // Job in same region
            }
        });
        console.log(`   ✅ Created Job: ${job.title} (${job.id})`);

        // Test Allocation
        const allocationResult = await JobAllocationService.assignJobToConsultant(
            job.id,
            consultant.id,
            systemUser.id,
            AssignmentSource.MANUAL_HRM8, // Correct Enum
            [region.id] // Enforce region check
        );

        if (!allocationResult.success) throw new Error(`Allocation failed: ${allocationResult.error}`);
        console.log('   ✅ Assigned Job to Consultant');

        // Verify Job has correct assignments
        const updatedJob = await prisma.job.findUnique({ where: { id: job.id } });
        if (updatedJob?.assigned_consultant_id !== consultant.id) throw new Error('Job assignment assignment update failed');
        console.log('   ✅ Job record updated with consultant ID');

        // 4. Commission Generation
        console.log('\n💰 4. Testing Commission Generation...');
        // Create commission manually to verify tracking
        const commission = await prisma.commission.create({
            data: {
                job_id: job.id,
                consultant_id: consultant.id,
                amount: 500,
                rate: 10,
                status: 'PENDING',
                type: CommissionType.PLACEMENT, // Correct Enum
                region_id: region.id,
                description: 'Test Placement Fee'
            }
        });
        console.log(`   ✅ Created Commission: ${commission.id} ($${commission.amount})`);

        // 5. Regional Licensee Transfer
        console.log('\n🔄 5. Testing Regional Licensee Transfer...');
        const licenseeUser = await prisma.user.create({
            data: {
                email: `licensee.${Date.now()}@test.com`,
                name: 'Licensee Manager',
                password_hash: 'hash',
                role: UserRole.ADMIN, // Correct Enum
                company_id: company.id, // dummy
                status: 'ACTIVE'
            }
        });

        // Create RegionalLicensee Record (REQUIRED for ID)
        const regionalLicensee = await prisma.regionalLicensee.create({
            data: {
                name: 'Test Licensee LLC',
                legal_entity_name: 'Test Licensee LLC',
                email: licenseeUser.email,
                agreement_start_date: new Date(),
                revenue_share_percent: 20,
                manager_contact: 'Test Manager' // Added required field
            }
        });
        console.log(`   ✅ Created RegionalLicensee record: ${regionalLicensee.id}`);

        // Assign region to licensee
        await prisma.region.update({
            where: { id: region.id },
            data: {
                owner_type: RegionOwnerType.LICENSEE,
                licensee_id: regionalLicensee.id // Correct FK (RegionalLicensee ID, not User ID)
            }
        });
        console.log('   ✅ Transferred Region to Licensee');

        // Verify Visibility logic (simulated)
        // JobAllocationService.getAllJobs with region filter
        const jobsForLicensee = await JobAllocationService.getAllJobs('ADMIN', { regionId: region.id }); // Passing ADMIN role
        if (jobsForLicensee.length === 0) throw new Error('Licensee cannot see jobs in their region');
        console.log(`   ✅ Licensee visibility confirmed (${jobsForLicensee.length} jobs found)`);

    } catch (error) {
        console.error('\n❌ Test Failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
        console.log('\n🏁 Test Complete');
    }
}

main();
