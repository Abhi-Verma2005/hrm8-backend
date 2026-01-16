/**
 * Test Audit History API Endpoints
 * Run: npx ts-node scripts/test_audit_history.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('\n🔍 Testing Audit History API\n');

    try {
        // 1. Get a licensee to test with
        const licensees = await prisma.regionalLicensee.findMany({
            take: 1,
            orderBy: { created_at: 'desc' },
        });

        if (licensees.length === 0) {
            console.log('❌ No licensees found. Create one first.');
            return;
        }

        const testLicensee = licensees[0];
        console.log(`📋 Testing with licensee: ${testLicensee.name} (${testLicensee.id})`);

        // 2. Check existing audit logs
        console.log('\n=== Existing Audit Logs ===');
        const existingLogs = await prisma.auditLog.findMany({
            where: { entity_id: testLicensee.id },
            orderBy: { performed_at: 'desc' },
            take: 5,
        });

        if (existingLogs.length > 0) {
            console.log(`✅ Found ${existingLogs.length} existing audit entries:`);
            existingLogs.forEach((log, i) => {
                console.log(`   ${i + 1}. ${log.action} - ${log.performed_at.toISOString()} by ${log.performed_by || 'system'}`);
                if (log.notes) console.log(`      Notes: ${log.notes}`);
            });
        } else {
            console.log('ℹ️  No existing audit logs for this licensee');
        }

        // 3. Create a test audit log entry
        console.log('\n=== Creating Test Audit Entry ===');
        const testAudit = await prisma.auditLog.create({
            data: {
                entity_type: 'LICENSEE',
                entity_id: testLicensee.id,
                action: 'TEST_ACTION',
                performed_by: 'automated-test',
                notes: 'Test audit entry created by test script',
                old_value: { status: 'ACTIVE' },
                new_value: { status: 'SUSPENDED' },
            },
        });
        console.log(`✅ Created test audit entry: ${testAudit.id}`);

        // 4. Query recent audit entries
        console.log('\n=== Recent Audit Entries (All Types) ===');
        const recentLogs = await prisma.auditLog.findMany({
            orderBy: { performed_at: 'desc' },
            take: 10,
        });
        console.log(`Found ${recentLogs.length} recent audit entries:`);
        recentLogs.forEach((log, i) => {
            console.log(`   ${i + 1}. [${log.entity_type}] ${log.action} - ${log.performed_at.toISOString().slice(0, 19)}`);
        });

        // 5. Verify the API response format matches frontend expectations
        console.log('\n=== API Response Format Check ===');
        const historyQuery = await prisma.auditLog.findMany({
            where: {
                entity_type: 'LICENSEE',
                entity_id: testLicensee.id,
            },
            orderBy: { performed_at: 'desc' },
            take: 50,
        });

        const formattedHistory = historyQuery.map(log => ({
            id: log.id,
            entityType: log.entity_type,
            entityId: log.entity_id,
            action: log.action,
            oldValue: log.old_value,
            newValue: log.new_value,
            performedBy: log.performed_by,
            performedAt: log.performed_at.toISOString(),
            ipAddress: log.ip_address,
            notes: log.notes,
        }));

        console.log(`✅ API would return ${formattedHistory.length} entries`);
        console.log('Sample entry:', JSON.stringify(formattedHistory[0], null, 2));

        // 6. Clean up test entry
        console.log('\n=== Cleanup ===');
        await prisma.auditLog.delete({ where: { id: testAudit.id } });
        console.log('✅ Deleted test audit entry');

        // 7. Summary
        console.log('\n=== Summary ===');
        const totalAuditLogs = await prisma.auditLog.count();
        const licenseeAuditLogs = await prisma.auditLog.count({
            where: { entity_type: 'LICENSEE' },
        });
        const regionAuditLogs = await prisma.auditLog.count({
            where: { entity_type: 'REGION' },
        });

        console.log(`📊 Total Audit Logs: ${totalAuditLogs}`);
        console.log(`   - LICENSEE: ${licenseeAuditLogs}`);
        console.log(`   - REGION: ${regionAuditLogs}`);

        console.log('\n✅ Audit History API Test Complete!\n');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
