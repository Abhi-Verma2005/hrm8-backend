import { execSync } from 'child_process';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const USER_COOKIE = 'user_cookie.txt';
const HRM8_COOKIE = 'hrm8_cookie.txt';

function sh(cmd: string, opts: { stdio?: 'pipe' | 'inherit' } = { stdio: 'pipe' }) {
  return execSync(cmd, { stdio: opts.stdio || 'pipe' }).toString('utf-8');
}

function curl({
  method,
  endpoint,
  body,
  cookieJar,
  headers = [],
  captureCookies = false,
}: {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  body?: Record<string, any>;
  cookieJar?: string;
  headers?: string[];
  captureCookies?: boolean;
}) {
  const url = `${BASE_URL}${endpoint}`;
  const bodyArg = body ? `-d '${JSON.stringify(body)}'` : '';
  const cookieArg = cookieJar ? (captureCookies ? `-c ${cookieJar}` : `-b ${cookieJar}`) : '';
  const hdrs = ['-H "Content-Type: application/json"', ...headers].join(' ');
  const cmd = `curl -s -X ${method} ${hdrs} ${cookieArg} ${bodyArg} "${url}"`;
  const out = sh(cmd);
  try {
    return JSON.parse(out);
  } catch {
    return { raw: out };
  }
}

function logStep(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function run() {
  // Clean cookie jars
  try { sh(`rm -f ${USER_COOKIE} ${HRM8_COOKIE}`); } catch {}

  // Health
  logStep('Health Check');
  console.log(curl({ method: 'GET', endpoint: '/health' }));

  const domainSuffix = Date.now();
  const companyDomain = `acme-${domainSuffix}.example`;
  const adminEmail = `admin@${companyDomain}`;
  const companyWebsite = `https://www.${companyDomain}`;
  const companyName = `Acme Corp ${domainSuffix}`;

  logStep('Company Registration');
  const reg = curl({
    method: 'POST',
    endpoint: '/api/auth/register/company',
    body: {
      companyName,
      companyWebsite,
      adminFirstName: 'Admin',
      adminLastName: 'User',
      adminEmail,
      password: 'TestPassword123',
      countryOrRegion: 'US',
      acceptTerms: true,
    },
  });
  if (!reg?.data?.companyId) throw new Error(`Registration failed: ${JSON.stringify(reg)}`);
  const companyId = reg.data.companyId as string;
  console.log({ companyId, adminUserId: reg.data.adminUserId });

  // Get verification token (dev-only) and verify company to activate account
  logStep('Fetch Verification Token (dev)');
  let tokenResp = curl({
    method: 'GET',
    endpoint: `/api/dev/verification-token?email=${encodeURIComponent(adminEmail)}&companyId=${companyId}`,
  });
  if (tokenResp?.success !== true) {
    logStep('Resend Verification Email');
    const resend = curl({
      method: 'POST',
      endpoint: '/api/auth/resend-verification',
      body: { email: adminEmail },
    });
    console.log(resend);
    tokenResp = curl({
      method: 'GET',
      endpoint: `/api/dev/verification-token?email=${encodeURIComponent(adminEmail)}&companyId=${companyId}`,
    });
  }
  const verificationToken = tokenResp?.data?.token;
  if (!verificationToken) throw new Error(`Failed to obtain verification token: ${JSON.stringify(tokenResp)}`);
  console.log({ verificationToken });

  logStep('Verify Company (auto-login via cookie)');
  const verifyResp = curl({
    method: 'POST',
    endpoint: '/api/auth/verify-company',
    body: { token: verificationToken, companyId },
    cookieJar: USER_COOKIE,
    captureCookies: true,
  });
  if (verifyResp?.success !== true) throw new Error(`Company verification failed: ${JSON.stringify(verifyResp)}`);
  console.log('Company verified');

  // Confirm session by calling /me
  logStep('Company Me');
  const meResp = curl({
    method: 'GET',
    endpoint: '/api/auth/me',
    cookieJar: USER_COOKIE,
  });
  if (meResp?.success !== true) throw new Error(`Company me failed: ${JSON.stringify(meResp)}`);
  console.log('Company session active');

  // Ensure HRM8 admin exists (run script) then login
  logStep('Ensure HRM8 Admin');
  try {
    sh('npx ts-node scripts/create-hrm8-admin.ts', { stdio: 'inherit' });
  } catch (e) {
    console.warn('create-hrm8-admin script failed or already exists, continuing...');
  }
  logStep('HRM8 Login');
  const hrm8Login = curl({
    method: 'POST',
    endpoint: '/api/hrm8/auth/login',
    body: {
      email: process.env.HRM8_ADMIN_EMAIL || 'rdx.omega2678@gmail.com',
      password: process.env.HRM8_ADMIN_PASSWORD || 'vAbhi2678',
    },
    cookieJar: HRM8_COOKIE,
    captureCookies: true,
  });
  if (hrm8Login?.success !== true) throw new Error(`HRM8 login failed: ${JSON.stringify(hrm8Login)}`);
  console.log('HRM8 login success');

  // Create Region
  logStep('Create Region');
  const regionCode = `US-WEST-${Date.now()}`;
  const regionRes = curl({
    method: 'POST',
    endpoint: '/api/hrm8/regions',
    cookieJar: HRM8_COOKIE,
    body: { name: 'US West', code: regionCode, country: 'United States' },
  });
  const regionId = regionRes?.data?.region?.id;
  if (!regionId) throw new Error(`Create region failed: ${JSON.stringify(regionRes)}`);
  console.log({ regionId });

  // Create Product
  logStep('Create Product');
  const productCode = `ATS-${Date.now()}`;
  const productRes = curl({
    method: 'POST',
    endpoint: '/api/hrm8/pricing/products',
    cookieJar: HRM8_COOKIE,
    body: {
      name: 'ATS Suite',
      code: productCode,
      category: 'ATS',
      description: 'Applicant Tracking System',
      isActive: true,
    },
  });
  const productId = productRes?.data?.product?.id;
  if (!productId) throw new Error(`Upsert product failed: ${JSON.stringify(productRes)}`);
  console.log({ productId });

  // Create PriceBook (Global, with one tier)
  logStep('Create PriceBook');
  const priceBookRes = curl({
    method: 'POST',
    endpoint: '/api/hrm8/pricing/books',
    cookieJar: HRM8_COOKIE,
    body: {
      name: 'Global Starter',
      description: 'Starter global pricing',
      isGlobal: true,
      currency: 'USD',
      tiers: [
        {
          productId,
          name: 'Basic',
          minQuantity: 1,
          unitPrice: 99,
          period: 'MONTHLY',
        },
      ],
    },
  });
  const priceBookId = priceBookRes?.data?.priceBook?.id;
  if (!priceBookId) throw new Error(`Create price book failed: ${JSON.stringify(priceBookRes)}`);
  console.log({ priceBookId });

  // Assign price book to company
  logStep('Assign PriceBook to Company');
  const assignRes = curl({
    method: 'POST',
    endpoint: `/api/hrm8/pricing/companies/${companyId}/assign`,
    cookieJar: HRM8_COOKIE,
    body: { priceBookId },
  });
  if (assignRes?.success !== true) throw new Error(`Assign price book failed: ${JSON.stringify(assignRes)}`);
  console.log('Assigned successfully');

  // Finance: invoices list (aging filter)
  logStep('Finance Invoices');
  const invoicesRes = curl({
    method: 'GET',
    endpoint: '/api/hrm8/finance/invoices?agingDays=30',
    cookieJar: HRM8_COOKIE,
  });
  console.log(invoicesRes);

  // Finance: dunning candidates
  logStep('Finance Dunning');
  const dunningRes = curl({
    method: 'GET',
    endpoint: '/api/hrm8/finance/dunning',
    cookieJar: HRM8_COOKIE,
  });
  console.log(dunningRes);

  // Finance: settlement calculate (will likely return an error with no revenues)
  logStep('Finance Settlement Calculate');
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();
  const settlementRes = curl({
    method: 'POST',
    endpoint: '/api/hrm8/finance/settlements/calculate',
    cookieJar: HRM8_COOKIE,
    body: { licenseeId: regionId, periodStart: start, periodEnd: end },
  });
  console.log(settlementRes);

  // Integrations: configure global provider
  logStep('Integrations Global Config');
  const integrationsUpsert = curl({
    method: 'POST',
    endpoint: '/api/hrm8/integrations/global-config',
    cookieJar: HRM8_COOKIE,
    body: {
      provider: 'jobtarget',
      name: 'JobTarget',
      category: 'JOB_BOARD',
      apiKey: 'test-key',
      apiSecret: 'test-secret',
      endpointUrl: 'https://api.jobtarget.example',
      isActive: true,
    },
  });
  console.log(integrationsUpsert);

  // Integrations: catalog
  logStep('Integrations Catalog');
  console.log(curl({
    method: 'GET',
    endpoint: '/api/hrm8/integrations/catalog',
    cookieJar: HRM8_COOKIE,
  }));

  // Integrations: usage
  logStep('Integrations Usage');
  console.log(curl({
    method: 'GET',
    endpoint: '/api/hrm8/integrations/usage',
    cookieJar: HRM8_COOKIE,
  }));

  // Cleanup cookie jars
  try { sh(`rm -f ${USER_COOKIE} ${HRM8_COOKIE}`); } catch {}

  console.log('\n✅ HRM8 Admin E2E flow completed\n');
}

run().catch((e) => {
  console.error('E2E error:', e);
  process.exit(1);
});
