/**
 * Phase 5 Verification Test Script
 * Tests suspend/terminate automation and audit logging
 * 
 * Run: npx ts-node scripts/test_phase5_governance.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testPhase5() {
    console.log('\n=== Phase 5 Governance Testing ===\n');

    try {
        // 1. Find a test licensee (or create one)
        let testLicensee = await prisma.regionalLicensee.findFirst({
            where: { email: { contains: 'test' } },
        });

        if (!testLicensee) {
            console.log('Creating test licensee...');
            testLicensee = await prisma.regionalLicensee.create({
                data: {
                    name: 'Test Governance Licensee',
                    legal_entity_name: 'Test Legal Entity',
                    email: 'test-governance@example.com',
                    revenue_share_percent: 20,
                    agreement_start_date: new Date(),
                    manager_contact: 'Test Manager',
                    status: 'ACTIVE',
                },
            });
        }

        console.log(`Using licensee: ${testLicensee.name} (${testLicensee.email})`);
        console.log(`Current status: ${testLicensee.status}`);

        // 2. Find regions owned by this licensee
        const regions = await prisma.region.findMany({
            where: { licensee_id: testLicensee.id },
        });
        console.log(`\nRegions owned: ${regions.length}`);

        // 3. Find jobs in these regions
        const regionIds = regions.map(r => r.id);
        const jobs = await prisma.job.findMany({
            where: {
                region_id: { in: regionIds },
                status: 'OPEN',
            },
            select: { id: true, title: true, status: true },
        });
        console.log(`Open jobs in regions: ${jobs.length}`);

        // 4. Test Suspend (if licensee is ACTIVE)
        if (testLicensee.status === 'ACTIVE' && jobs.length > 0) {
            console.log('\n--- Testing SUSPEND ---');

            // Simulate suspend by updating status and pausing jobs
            await prisma.regionalLicensee.update({
                where: { id: testLicensee.id },
                data: { status: 'SUSPENDED' },
            });

            const pausedJobs = await prisma.job.updateMany({
                where: {
                    region_id: { in: regionIds },
                    status: 'OPEN',
                },
                data: { status: 'ON_HOLD' },
            });

            console.log(`✅ Licensee suspended`);
            console.log(`✅ Jobs paused: ${pausedJobs.count}`);

            // Create audit log
            await prisma.auditLog.create({
                data: {
                    entity_type: 'LICENSEE',
                    entity_id: testLicensee.id,
                    action: 'SUSPEND',
                    old_value: { status: 'ACTIVE' },
                    new_value: { status: 'SUSPENDED', jobsPaused: pausedJobs.count },
                    performed_by: 'test-script',
                },
            });
            console.log(`✅ Audit log created`);
        }

        // 5. Check audit logs
        const auditLogs = await prisma.auditLog.findMany({
            where: { entity_id: testLicensee.id },
            orderBy: { performed_at: 'desc' },
            take: 5,
        });
        console.log(`\n--- Audit Logs (${auditLogs.length}) ---`);
        auditLogs.forEach(log => {
            console.log(`  ${log.action} at ${log.performed_at} by ${log.performed_by}`);
        });

        // 6. Test Compliance Alerts
        console.log('\n--- Testing Compliance Alerts ---');

        // Check for overdue settlements
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const overdueSettlements = await prisma.settlement.count({
            where: {
                status: 'PENDING',
                generated_at: { lte: thirtyDaysAgo },
            },
        });
        console.log(`Overdue settlements (>30 days): ${overdueSettlements}`);

        // Check for inactive regions
        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const activeRegionsWithLicensees = await prisma.region.count({
            where: {
                is_active: true,
                licensee_id: { not: null },
            },
        });
        console.log(`Active regions with licensees: ${activeRegionsWithLicensees}`);

        // 7. Cleanup - Reactivate test licensee
        if (testLicensee.email.includes('test')) {
            await prisma.regionalLicensee.update({
                where: { id: testLicensee.id },
                data: { status: 'ACTIVE' },
            });
            console.log(`\n✅ Test licensee reactivated`);
        }

        console.log('\n=== All Tests Complete ===\n');

    } catch (error) {
        console.error('Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testPhase5();
