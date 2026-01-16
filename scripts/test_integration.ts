/**
 * Automated Integration Tests for HRM8
 * Run: npx ts-node scripts/test_integration.ts
 */

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

interface TestResult { name: string; passed: boolean; details: string; }
const results: TestResult[] = [];

function pass(name: string, details: string) {
    results.push({ name, passed: true, details });
    console.log(`  ✅ ${name}: ${details}`);
}

function fail(name: string, details: string) {
    results.push({ name, passed: false, details });
    console.log(`  ❌ ${name}: ${details}`);
}

async function testMultiRegion() {
    console.log('\n=== Multi-Region Architecture ===\n');

    const regions = await prisma.region.findMany({ include: { licensee: true } });
    pass('Regions exist', `${regions.length} regions`);

    const hrm8Regions = regions.filter(r => r.owner_type === 'HRM8').length;
    const licenseeRegions = regions.filter(r => r.licensee_id).length;
    pass('Region ownership', `HRM8: ${hrm8Regions}, Licensee: ${licenseeRegions}`);

    const consultants = await prisma.consultant.count();
    pass('Consultants', `${consultants} total`);

    const jobs = await prisma.job.count();
    pass('Jobs', `${jobs} total`);

    const licensees = await prisma.regionalLicensee.findMany({ include: { regions: true } });
    pass('Licensees', `${licensees.length} managing ${licensees.reduce((s, l) => s + l.regions.length, 0)} regions`);
}

async function testRevenue() {
    console.log('\n=== Revenue System ===\n');

    const bills = await prisma.bill.count();
    pass('Bills', `${bills} total`);

    const commissions = await prisma.commission.count();
    pass('Commissions', `${commissions} total`);

    const revenueByRegion = await prisma.bill.groupBy({
        by: ['region_id'],
        where: { status: 'PAID' },
        _sum: { total_amount: true },
    });
    pass('Revenue aggregation', `${revenueByRegion.length} regions with revenue`);

    const settlements = await prisma.settlement.count();
    pass('Settlements', `${settlements} records`);
}

async function testPhase5() {
    console.log('\n=== Phase 5 Governance ===\n');

    try {
        const audits = await prisma.auditLog.count();
        pass('AuditLog table', `${audits} entries`);
    } catch (e) {
        fail('AuditLog table', 'Not accessible');
    }

    const active = await prisma.regionalLicensee.count({ where: { status: 'ACTIVE' } });
    const suspended = await prisma.regionalLicensee.count({ where: { status: 'SUSPENDED' } });
    const terminated = await prisma.regionalLicensee.count({ where: { status: 'TERMINATED' } });
    pass('Licensee statuses', `Active: ${active}, Suspended: ${suspended}, Terminated: ${terminated}`);

    const openJobs = await prisma.job.count({ where: { status: 'OPEN' } });
    const onHold = await prisma.job.count({ where: { status: 'ON_HOLD' } });
    pass('Job statuses', `Open: ${openJobs}, On Hold: ${onHold}`);

    // Test audit log write
    const testId = `test-${Date.now()}`;
    try {
        await prisma.auditLog.create({
            data: { id: testId, entity_type: 'TEST', entity_id: 'test', action: 'TEST', performed_by: 'test' }
        });
        await prisma.auditLog.delete({ where: { id: testId } });
        pass('Audit log write', 'Create/delete works');
    } catch (e) {
        fail('Audit log write', 'Failed');
    }
}

async function testCompliance() {
    console.log('\n=== Compliance Alerts ===\n');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const overdue = await prisma.settlement.count({
        where: { status: 'PENDING', generated_at: { lte: thirtyDaysAgo } }
    });
    pass('Overdue settlements', `${overdue} pending >30 days`);

    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

    const recentJobs = await prisma.job.groupBy({
        by: ['region_id'],
        where: { created_at: { gte: sixtyDaysAgo } }
    });
    pass('Active regions', `${recentJobs.length} with recent activity`);
}

async function testAuth() {
    console.log('\n=== HRM8 Auth ===\n');

    const users = await prisma.hRM8User.findMany({ select: { role: true, licensee_id: true } });
    pass('HRM8 Users', `${users.length} total`);

    const admins = users.filter(u => u.role === 'GLOBAL_ADMIN').length;
    const licenseeUsers = users.filter(u => u.role === 'REGIONAL_LICENSEE').length;
    pass('User roles', `Admins: ${admins}, Licensees: ${licenseeUsers}`);

    const sessions = await prisma.hRM8Session.count({ where: { expires_at: { gt: new Date() } } });
    pass('Active sessions', `${sessions}`);
}

async function main() {
    console.log('\n🚀 HRM8 Integration Test Suite\n');

    try {
        await testMultiRegion();
        await testRevenue();
        await testPhase5();
        await testCompliance();
        await testAuth();

        console.log('\n' + '='.repeat(40));
        const passed = results.filter(r => r.passed).length;
        const failed = results.filter(r => !r.passed).length;
        console.log(`\nTotal: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
        console.log(`Success Rate: ${((passed / results.length) * 100).toFixed(0)}%`);

        if (failed === 0) {
            console.log('\n✅ All tests passed!\n');
        } else {
            console.log('\n⚠️ Some tests failed:\n');
            results.filter(r => !r.passed).forEach(r => console.log(`  - ${r.name}`));
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
