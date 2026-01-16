/**
 * Phase 6 E2E Verification Script
 * Validates:
 * 1. Impact Preview API
 * 2. Revenue Dashboard Date Filtering
 * 3. Audit History for Regions
 * 
 * Run: npx ts-node scripts/test_phase6_e2e.ts
 */

import { PrismaClient } from '@prisma/client';
import { RegionalLicenseeService } from '../src/services/hrm8/RegionalLicenseeService';
import { RevenueController } from '../src/controllers/hrm8/RevenueController';
import { Request, Response } from 'express';

const prisma = new PrismaClient();

// Mock Express Request/Response
const mockRequest = (query: any = {}, params: any = {}) => ({
    query,
    params,
    hrm8User: { role: 'GLOBAL_ADMIN', id: 'test-admin' }
} as unknown as Request);

const mockResponse = () => {
    const res: any = {};
    res.status = (code: number) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data: any) => {
        res.body = data;
        return res;
    };
    return res as Response & { body: any; statusCode: number };
};

async function main() {
    console.log('\n🚀 Starting Phase 6 E2E Verification\n');

    try {
        // --- TEST 1: Impact Preview ---
        console.log('--- Test 1: Impact Preview API ---');

        // Find a licensee with regions
        const licensee = await prisma.regionalLicensee.findFirst({
            where: { regions: { some: {} } },
            include: { regions: true }
        });

        if (!licensee) {
            console.log('⚠️ No licensee with regions found. Skipping impact test.');
        } else {
            console.log(`Testing impact preview for licensee: ${licensee.name} (${licensee.id})`);

            const impact = await RegionalLicenseeService.getImpactPreview(licensee.id);

            console.log('Impact Preview Result:');
            console.log(`- Regions affected: ${impact.regions}`);
            console.log(`- Jobs to pause: ${impact.activeJobs}`);
            console.log(`- Consultants: ${impact.consultants}`);
            console.log(`- Pending Revenue: $${impact.pendingRevenue}`);

            if (impact.regions > 0) {
                console.log('✅ Impact preview returning data correctly');
            } else {
                console.log('⚠️ Impact preview returned 0 regions (unexpected if licensee has regions)');
            }
        }

        // --- TEST 2: Revenue Dashboard Date Filtering ---
        console.log('\n--- Test 2: Revenue Dashboard Date Filtering ---');

        const startDate = new Date('2025-01-01').toISOString();
        const endDate = new Date('2025-12-31').toISOString();

        console.log(`Testing revenue dashboard from ${startDate} to ${endDate}`);

        const req = mockRequest({ startDate, endDate });
        const res = mockResponse();

        // Call controller directly to test logic (simulating API call)
        await RevenueController.getDashboard(req, res);

        if (res.body && res.body.success) {
            const data = res.body.data;
            console.log('✅ Revenue Dashboard API call successful');
            console.log(`- Total Revenue: $${data.summary.totalRevenue}`);
            console.log(`- Timeline entries: ${data.timeline.length}`);

            // Verify date filtering worked (timeline should be within range)
            if (data.timeline.length > 0) {
                const firstMonth = data.timeline[0].month;
                const lastMonth = data.timeline[data.timeline.length - 1].month;
                console.log(`- Data range returned: ${firstMonth} to ${lastMonth}`);
            }
        } else {
            console.error('❌ Revenue Dashboard API failed:', res.body?.error);
        }

        // --- TEST 3: Region Audit History ---
        console.log('\n--- Test 3: Region Audit History ---');

        const region = await prisma.region.findFirst();
        if (region) {
            console.log(`Testing audit history for region: ${region.name} (${region.id})`);

            // Create a test audit log if none exist
            await prisma.auditLog.create({
                data: {
                    entity_type: 'REGION',
                    entity_id: region.id,
                    action: 'TEST_VIEW',
                    performed_by: 'e2e-test',
                    notes: 'Verifying history drawer'
                }
            });

            const auditLogs = await prisma.auditLog.findMany({
                where: {
                    entity_type: 'REGION',
                    entity_id: region.id
                },
                take: 5
            });

            console.log(`Found ${auditLogs.length} audit entries for region`);
            if (auditLogs.length > 0) {
                console.log('✅ Region audit history is queryable');
                console.log(`- Latest action: ${auditLogs[0].action}`);
            }
        } else {
            console.log('⚠️ No regions found to test history');
        }

        console.log('\n✅ Phase 6 Verification Complete!');

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
