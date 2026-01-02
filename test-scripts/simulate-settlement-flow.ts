import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

const prisma = new PrismaClient();
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const HRM8_COOKIE = 'hrm8_cookie.txt';

function sh(cmd: string, opts: { stdio?: 'pipe' | 'inherit' } = { stdio: 'pipe' }) {
  return execSync(cmd, { stdio: opts.stdio || 'pipe' }).toString('utf-8');
}

function curl({
  method,
  endpoint,
  body,
  cookieJar,
  captureCookies = false,
}: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  body?: Record<string, any>;
  cookieJar?: string;
  captureCookies?: boolean;
}) {
  const url = `${BASE_URL}${endpoint}`;
  const bodyArg = body ? `-d '${JSON.stringify(body)}'` : '';
  const cookieArg = cookieJar ? (captureCookies ? `-c ${cookieJar}` : `-b ${cookieJar}`) : '';
  const hdrs = ['-H "Content-Type: application/json"'].join(' ');
  const cmd = `curl -s -X ${method} ${hdrs} ${cookieArg} ${bodyArg} "${url}"`;
  const out = sh(cmd);
  try {
    return JSON.parse(out);
  } catch {
    return { raw: out };
  }
}

async function runSimulation() {
  console.log('🚀 Starting API-based Settlement Flow Simulation...\n');

  try {
    // 1. Admin Login
    console.log('--- Step 1: Admin Login ---');
    const loginRes = curl({
      method: 'POST',
      endpoint: '/api/hrm8/auth/login',
      body: {
        email: 'rdx.omega2678@gmail.com',
        password: 'vAbhi2678',
      },
      cookieJar: HRM8_COOKIE,
      captureCookies: true,
    });

    if (loginRes?.success !== true) {
      throw new Error(`Login failed: ${JSON.stringify(loginRes)}`);
    }
    console.log('✅ Login successful (Session captured)\n');

    const timestamp = Date.now();
    const periodStart = format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');
    const periodEnd = format(endOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd');

    // 2. Create Licensee via API
    console.log('--- Step 2: Creating Licensee via API ---');
    const licenseeRes = curl({
      method: 'POST',
      endpoint: '/api/hrm8/licensees',
      cookieJar: HRM8_COOKIE,
      body: {
        name: `API Licensee ${timestamp}`,
        legalEntityName: `API Licensee ${timestamp} Ltd`,
        email: `api-licensee-${timestamp}@example.com`,
        phone: '+123456789',
        agreementStartDate: new Date().toISOString(),
        revenueSharePercent: 70,
        managerContact: 'API Test Manager',
      },
    });

    if (licenseeRes?.success !== true) {
      throw new Error(`Create licensee failed: ${JSON.stringify(licenseeRes)}`);
    }
    const licenseeId = licenseeRes.data.licensee.id;
    console.log(`✅ Created Licensee ID: ${licenseeId}\n`);

    // 3. Create Region via API
    console.log('--- Step 3: Creating Region via API ---');
    const regionRes = curl({
      method: 'POST',
      endpoint: '/api/hrm8/regions',
      cookieJar: HRM8_COOKIE,
      body: {
        name: `API Region ${timestamp}`,
        code: `TEST-API-${timestamp}`,
        country: 'United States',
        ownerType: 'LICENSEE',
        licenseeId: licenseeId,
      },
    });

    if (regionRes?.success !== true) {
      throw new Error(`Create region failed: ${JSON.stringify(regionRes)}`);
    }
    const regionId = regionRes.data.region.id;
    console.log(`✅ Created Region ID: ${regionId}\n`);

    // 4. Record Revenue via API
    console.log('--- Step 4: Recording Revenue via API ---');
    const revenueAmount = 10000;
    const revenueRes = curl({
      method: 'POST',
      endpoint: '/api/hrm8/revenue',
      cookieJar: HRM8_COOKIE,
      body: {
        regionId: regionId,
        licenseeId: licenseeId,
        periodStart: periodStart,
        periodEnd: periodEnd,
        totalRevenue: revenueAmount,
        licenseeShare: (revenueAmount * 70) / 100,
        hrm8Share: (revenueAmount * 30) / 100,
      },
    });

    if (revenueRes?.success !== true) {
      throw new Error(`Record revenue failed: ${JSON.stringify(revenueRes)}`);
    }
    const revenueId = revenueRes.data.revenue.id;
    console.log(`✅ Recorded Revenue ID: ${revenueId}\n`);

    // 5. Confirm Revenue via API
    console.log('--- Step 5: Confirming Revenue via API ---');
    const confirmRes = curl({
      method: 'PUT',
      endpoint: `/api/hrm8/revenue/${revenueId}/confirm`,
      cookieJar: HRM8_COOKIE,
    });

    if (confirmRes?.success !== true) {
      throw new Error(`Confirm revenue failed: ${JSON.stringify(confirmRes)}`);
    }
    console.log('✅ Revenue confirmed\n');

    // 6. Calculate Settlement via API
    console.log('--- Step 6: Calculating Settlement via API ---');
    const settlementRes = curl({
      method: 'POST',
      endpoint: '/api/hrm8/finance/settlements/calculate',
      cookieJar: HRM8_COOKIE,
      body: {
        licenseeId: licenseeId,
        periodStart: periodStart,
        periodEnd: periodEnd,
      },
    });

    if (settlementRes?.success !== true) {
      throw new Error(`Calculate settlement failed: ${JSON.stringify(settlementRes)}`);
    }
    const settlement = settlementRes.data.settlement;
    console.log('✅ Settlement Generated via API:');
    console.log(`   - Total Revenue: $${settlement.total_revenue}`);
    console.log(`   - Licensee Share: $${settlement.licensee_share}`);
    console.log(`   - HRM8 Share: $${settlement.hrm8_share}`);
    console.log(`   - Status: ${settlement.status}\n`);

    console.log('✅ API-based Simulation Completed Successfully!');

  } catch (error) {
    console.error('\n❌ API Simulation Failed:', error);
  } finally {
    try { sh(`rm -f ${HRM8_COOKIE}`); } catch {}
    await prisma.$disconnect();
  }
}

runSimulation();
