
import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:3000/api';

async function runTest() {
    console.log('🚀 Starting Dashboard Analytics Test...');

    // 1. Setup: Get a consultant (or create one if needed, but assuming one exists from previous tests)
    // We'll use the one from previous tests: test.consultant@example.com
    const email = 'alookikachori@gmail.com';
    const password = 'vAbhi2678';

    try {
        // Login
        console.log('1. Logging in...');
        const loginRes = await axios.post(`${API_URL}/consultant/auth/login`, {
            email,
            password
        }, {
            validateStatus: () => true // Don't throw on error status
        });

        if (loginRes.status !== 200) {
            console.error('❌ Login failed:', loginRes.data);
            process.exit(1);
        }

        // Extract cookies
        const cookie = loginRes.headers['set-cookie'];
        if (!cookie) {
            console.error('❌ No cookie received');
            process.exit(1);
        }
        console.log('✅ Logged in successfully');

        // 2. Configure Region Targets (to verify they come back)
        // Get consultant region
        const consultant = await prisma.consultant.findUnique({
            where: { email },
            include: { region: true }
        });

        if (!consultant || !consultant.region_id) {
            console.error('❌ Consultant has no region');
            process.exit(1);
        }

        console.log(`ℹ️ Consultant Region: ${consultant.region!.name}`);

        // Set targets strictly for test
        await prisma.region.update({
            where: { id: consultant.region_id },
            data: {
                monthly_revenue_target: 50000,
                monthly_placement_target: 5
            } as any
        });
        console.log('✅ Set regional targets (Rev: 50k, Placements: 5)');

        // 3. Call Analytics Endpoint
        console.log('3. Calling Analytics Endpoint...');
        const analyticsRes = await axios.get(`${API_URL}/consultant/analytics/dashboard`, {
            headers: {
                Cookie: cookie
            }
        });

        if (analyticsRes.status === 200) {
            const data = analyticsRes.data.data;
            console.log('✅ Received Analytics Data');

            // Assertions
            const targetRev = data.targets.monthlyRevenue;
            console.log(`   - Target Revenue: ${targetRev} (Expected: 50000)`);
            if (targetRev !== 50000) console.error('   ❌ Mismatch in revenue target');
            else console.log('   ✅ Verification Passed');

            // Check structure
            if (Array.isArray(data.activeJobs)) console.log(`   ✅ Active Jobs: ${data.activeJobs.length}`);
            else console.error('   ❌ Active Jobs is not an array');

            if (Array.isArray(data.pipeline)) console.log(`   ✅ Pipeline Stages: ${data.pipeline.length}`);

            if (Array.isArray(data.trends)) console.log(`   ✅ Monthly Trends: ${data.trends.length}`);

        } else {
            console.error('❌ Analytics Request Failed:', analyticsRes.status, analyticsRes.data);
        }

    } catch (error: any) {
        console.error('❌ Test Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
