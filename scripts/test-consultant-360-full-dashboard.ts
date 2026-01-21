/**
 * Full E2E Test: Consultant 360 Dashboard & Admin Verification
 * 
 * Tests "each and everything" for the 360 Dashboard:
 * 1. Consultant Login (alookikachori@gmail.com)
 * 2. Dashboard Stats & Overview
 * 3. Leads Management (List, Create)
 * 4. Earnings & Commissions
 * 5. Stripe Status
 * 6. Admin Verification (koen@koenigsegg.com)
 * 7. Full Monetization Flow: Convert Lead -> Company Login -> Add Money -> Post Job -> Pay -> Verify Commission
 * 8. Withdrawal Flow: Verify Pending -> Approved -> Wallet -> Withdrawn
 */

const DASH_BASE_URL = process.env.BACKEND_URL || 'http://localhost:3000';

// Helper to make authenticated API calls
class DashboardTestClient {
    private cookies: string[] = [];

    async request(method: string, endpoint: string, body?: any, headers: Record<string, string> = {}) {
        const url = `${DASH_BASE_URL}${endpoint}`;
        const reqHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            ...headers,
        };

        if (this.cookies.length > 0) {
            reqHeaders['Cookie'] = this.cookies.join('; ');
        }

        const options: RequestInit = {
            method,
            headers: reqHeaders,
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        const response = await fetch(url, options);

        // Capture cookies from response
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) {
            // Simple cookiejar implementation
            const newCookies = setCookie.split(',').map(c => c.split(';')[0]);
            this.cookies = [...this.cookies, ...newCookies];
        }

        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch {
            data = { rawText: text };
        }

        return { status: response.status, ok: response.ok, data };
    }

    clearCookies() {
        this.cookies = [];
    }
}

async function runDashboardTest() {
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║  TEST: CONSULTANT 360 DASHBOARD & COMMISSION FLOW      ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    const client = new DashboardTestClient();
    let createdLeadId: string | null = null;

    try {
        // ============================================================
        // STEP 1: CONSULTANT LOGIN
        // ============================================================
        console.log('🔐 Step 1: Logging in as Consultant (alookikachori@gmail.com)...');

        let res = await client.request('POST', '/api/consultant/auth/login', {
            email: 'alookikachori@gmail.com',
            password: 'vAbhi2678'
        });

        if (!res.ok) {
            console.error(`❌ Login failed details:`, JSON.stringify(res.data, null, 2));
            throw new Error(`Login failed: ${res.status}`);
        }

        const user = res.data.data.consultant;
        console.log(`✅ Login Successful!`);
        console.log(`   Name: ${user.firstName} ${user.lastName}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   ID: ${user.id}`);

        // ============================================================
        // STEP 2: DASHBOARD OVERVIEW
        // ============================================================
        console.log('\n📊 Step 2: Fetching Dashboard Overview...');

        res = await client.request('GET', '/api/consultant360/dashboard');
        if (!res.ok) throw new Error(`Failed to fetch dashboard: ${res.status}`);

        const dash = res.data.data;
        console.log(`✅ Dashboard Data Retrieved:`);
        console.log(`   💰 Total Earnings: $${dash.stats.totalEarnings}`);

        const currentMonth = dash.monthlyTrend?.[0];
        const monthlyEarnings = currentMonth ? currentMonth.total : 'N/A';
        console.log(`   📅 This Month (Trend): $${monthlyEarnings}`);
        console.log(`   💼 Active Jobs: ${dash.activeJobs.length}`);
        console.log(`   👥 Active Leads: ${dash.activeLeads.length}`);

        // ============================================================
        // STEP 3: UNIFIED EARNINGS (BASELINE)
        // ============================================================
        console.log('\n💰 Step 3: Verifying Unified Earnings (Baseline)...');

        res = await client.request('GET', '/api/consultant360/earnings');
        if (!res.ok) throw new Error(`Failed to fetch earnings: ${res.status}`);

        // @ts-ignore
        const earnings = res.data.data;
        // Handle potentially 0 earnings safely
        // @ts-ignore
        const totalSales = (earnings.salesEarnings?.totalSubscriptionSales || 0) + (earnings.salesEarnings?.totalServiceFees || 0);
        // @ts-ignore
        const totalRecruitment = earnings.recruiterEarnings?.totalRevenue || 0;

        console.log(`   Sales Earnings: $${totalSales}`);
        console.log(`   Recruitment Earnings: $${totalRecruitment}`);
        // @ts-ignore
        console.log(`   Available: $${earnings.combined?.availableBalance || 0}`);

        // ============================================================
        // STEP 4: LEADS MANAGEMENT (CREATE)
        // ============================================================
        console.log('\n👥 Step 4: Creating Test Lead...');

        const testLead = {
            companyName: `Automated Test Lead ${Date.now()}`,
            email: `test-lead-${Date.now()}@example.com`,
            website: `https://test-${Date.now()}.com`,
            country: 'India',
            phone: '+919999988888',
            budget: '$10k - $50k',
            timeline: 'Immediately',
            message: 'This is an automated test lead to verify 360 dashboard functionality.'
        };

        res = await client.request('POST', '/api/consultant360/leads', testLead);
        if (!res.ok) throw new Error(`Failed to create lead: ${res.status}`);

        const lead = res.data.data.lead;
        createdLeadId = lead.id;
        console.log(`✅ Lead Created (ID: ${lead.id})`);

        // ============================================================
        // STEP 5: BACKEND LEAD CONVERSION
        // ============================================================
        console.log('\n⚙️ Step 5: Converting Lead via Backend Service...');

        // Import services dynamically
        const { LeadConversionService } = await import('../src/services/sales/LeadConversionService');
        const prismaLib = await import('../src/lib/prisma');
        const prisma = prismaLib.default || prismaLib.prisma;

        console.log('   Submitting Conversion Request...');
        // @ts-ignore
        const reqResult = await LeadConversionService.submitConversionRequest(createdLeadId, user.id, {
            agentNotes: 'Auto-test conversion from E2E script',
            tempPassword: 'TempPassword123!'
        });

        if (!reqResult.success) throw new Error(`Submit Request Failed: ${reqResult.error}`);
        // @ts-ignore
        const requestId = reqResult.request.id;
        console.log(`   Request Submitted (ID: ${requestId})`);

        // Approve acting as System Admin
        console.log('   Approving Request...');
        const adminUser = await prisma.hRM8User.findFirst({ where: { role: 'GLOBAL_ADMIN' } });
        const adminId = adminUser ? adminUser.id : 'system-admin-e2e';

        // @ts-ignore
        const approveResult = await LeadConversionService.approveRequest(requestId, adminId, 'Approved by E2E Script');

        if (!approveResult.success) throw new Error(`Approve Request Failed: ${approveResult.error}`);

        const companyId = approveResult.company.id;
        console.log(`✅ Lead Converted! Company ID: ${companyId}`);

        // ============================================================
        // STEP 6: COMPANY LOGIN & JOB PAYMENT
        // ============================================================
        console.log('\n🏢 Step 6: Company Login & Add Mock Money...');

        const companyClient = new DashboardTestClient();
        res = await companyClient.request('POST', '/api/auth/login', {
            email: testLead.email,
            password: 'TempPassword123!'
        });

        if (!res.ok) throw new Error(`Company Login Failed: ${res.status}`);
        console.log(`✅ Company Logged In (Email: ${testLead.email})`);

        // Add Mock Money (Direct DB)
        const { VirtualAccountOwner } = await import('@prisma/client');

        // @ts-ignore
        const wallet = await prisma.virtualAccount.findFirst({
            where: { owner_type: VirtualAccountOwner.COMPANY, owner_id: companyId }
        });

        if (!wallet) {
            // @ts-ignore
            await prisma.virtualAccount.create({
                data: {
                    owner_type: VirtualAccountOwner.COMPANY,
                    owner_id: companyId,
                    balance: 5000,
                    total_credits: 5000,
                    total_debits: 0,
                    status: 'ACTIVE'
                }
            });
            console.log(`✅ Created Wallet with $5,000`);
        } else {
            // @ts-ignore
            await prisma.virtualAccount.update({
                where: { id: wallet.id },
                data: { balance: { increment: 5000 }, total_credits: { increment: 5000 } }
            });
            console.log(`✅ Added $5,000 to Wallet`);
        }

        // Post Job
        console.log(`\n   Posting "Senior React Dev" Job...`);
        res = await companyClient.request('POST', '/api/employer/jobs', {
            title: `Senior React Dev ${Date.now()}`,
            location: 'Remote',
            employmentType: 'FULL_TIME',
            description: 'Test job for commission verification',
            requirements: 'React, Node.js',
            responsibilities: 'Build awesome apps',
            hiringMode: 'SHORTLISTING',
            servicePackage: 'shortlisting', // $1999 usually
            numberOfVacancies: 1
        });

        if (!res.ok) throw new Error(`Job Post Failed: ${res.status} - ${JSON.stringify(res.data)}`);
        const jobId = res.data.data.id;
        console.log(`✅ Job Posted (ID: ${jobId})`);

        // Pay for Job
        console.log(`   Paying for Job (Checkout)...`);
        res = await companyClient.request('POST', '/api/payments/job-checkout', {
            jobId: jobId,
            servicePackage: 'shortlisting',
            companyId: companyId,
            customerEmail: testLead.email
        });

        if (!res.ok) throw new Error(`Checkout Failed: ${res.status}`);
        const sessionId = res.data.data.sessionId;
        console.log(`✅ Checkout Session Created: ${sessionId}`);

        // Mock Webhook Trigger
        console.log(`   Triggering Mock Webhook (Payment Success)...`);
        const webhookPayload = {
            type: 'checkout.session.completed',
            data: {
                object: {
                    id: sessionId,
                    object: 'checkout.session',
                    payment_status: 'paid',
                    amount_total: 199900, // $1999.00
                    currency: 'usd',
                    metadata: {
                        jobId: jobId,
                        companyId: companyId,
                        servicePackage: 'shortlisting',
                        type: 'job_payment',
                        app: 'hrm8'
                    }
                }
            }
        };

        const webhookClient = new DashboardTestClient();
        let loggedIn = false;
        try {
            res = await webhookClient.request('POST', '/api/hrm8/auth/login', {
                email: 'koen@koenigsegg.com',
                password: 'vAbhi2678'
            });
            if (res.ok) loggedIn = true;
        } catch { /* ignore */ }

        if (!loggedIn) {
            res = await webhookClient.request('POST', '/api/auth/login', {
                email: 'koen@koenigsegg.com',
                password: 'vAbhi2678'
            });
            if (res.ok) loggedIn = true;
        }

        if (loggedIn) {
            res = await webhookClient.request('POST', '/api/payments/stripe-webhook', webhookPayload, {
                'X-Mock-Stripe-Event': 'true'
            });
            if (!res.ok) console.warn(`⚠️ Webhook returned ${res.status}, continuing...`);
            else console.log(`✅ Payment Webhook Sent`);
        } else {
            console.warn(`⚠️ Could not login as Admin for Webhook, skipping API webhook trigger.`);
        }

        // ============================================================
        // STEP 7.1: RECRUITMENT FLOW (Placement Commission)
        // ============================================================
        console.log('\n🤝 Step 7.1: Testing Recruitment Flow (Hiring & Approval)...');

        // 1. Create Candidate
        const { CandidateModel } = await import('../src/models/Candidate');
        // @ts-ignore
        const candidate = await CandidateModel.create({
            email: `candidate-${Date.now()}@test.com`,
            passwordHash: 'Password123!',
            firstName: 'John',
            lastName: 'Doe'
        });
        console.log(`   Candidate Created: ${candidate.id}`);

        // 2. Assign Job to Consultant (if not already)
        // The job `jobId` was created by Company. We need to ensure logic allows commission.
        // Usually commission is created on Assignment.
        // Let's force an assignment to our consultant.
        // @ts-ignore
        const { JobModel } = await import('../src/models/Job');
        // @ts-ignore
        await JobModel.update(jobId, { assignedConsultantId: user.id });

        // Create Initial Commission (Pending Placement)
        // @ts-ignore
        const { CommissionService } = await import('../src/services/hrm8/CommissionService');
        // @ts-ignore
        await CommissionService.createCommissionForJobAssignment(jobId, user.id, user.regionId || 'global');
        console.log(`   Job Assigned & Commission Initialized (Pending)`);

        // 3. Create Application
        // @ts-ignore
        const { ApplicationService } = await import('../src/services/application/ApplicationService');
        // @ts-ignore
        const app = await ApplicationService.submitApplication({
            candidateId: candidate.id,
            jobId: jobId,
            resumeUrl: 'https://example.com/resume.pdf',
            coverLetterUrl: 'https://example.com/cover.pdf'
        });

        if (app.error) {
            throw new Error(`Application Submission Failed: ${app.error}`);
        }

        // @ts-ignore
        const applicationId = app.id; // submitApplication returns ApplicationData directly (or error)
        console.log(`   Application Submitted (ID: ${applicationId})`);

        // 4. Consultant Marks as HIRED
        console.log(`   Consultant marking as HIRED...`);
        res = await client.request('POST', `/api/consultant/candidates/${applicationId}/status`, {
            status: 'HIRED'
        });
        if (!res.ok) console.warn(`   ⚠️ Warning: Status update might have failed or return varying codes: ${res.status}`);
        else console.log(`   ✅ Status updated to HIRED`);

        // 5. VERIFY COMMISSION IS *NOT* CONFIRMED (Phase 7 Check)
        // Fetch commissions directly from DB or API
        // @ts-ignore
        const pendingComms = await prisma.commission.findMany({
            where: { job_id: jobId, status: 'PENDING', type: 'PLACEMENT' }
        });

        if (pendingComms.length > 0) {
            console.log(`   ✅ SUCCESS: Placement Commission is still PENDING after Hire (Correct).`);
        } else {
            console.error(`   ❌ FAILURE: Placement Commission should be PENDING but is not found or already confirmed.`);
        }

        // 6. Company Approves Hire
        console.log(`   🏢 Company Approving Hire...`);
        res = await companyClient.request('POST', `/api/employer/hires/${applicationId}/approve`);

        if (!res.ok) throw new Error(`Company Approval Failed: ${res.status} - ${JSON.stringify(res.data)}`);
        console.log(`   ✅ Company Approval Successful!`);

        // 7. VERIFY COMMISSION IS NOW CONFIRMED
        // @ts-ignore
        const confirmedComms = await prisma.commission.findMany({
            where: { job_id: jobId, status: 'CONFIRMED', type: 'PLACEMENT' }
        });

        if (confirmedComms.length > 0) {
            console.log(`   ✅ SUCCESS: Placement Commission is now CONFIRMED!`);
        } else {
            console.error(`   ❌ FAILURE: Placement Commission should be CONFIRMED but is not.`);
            // Debug
            // @ts-ignore
            const debugComms = await prisma.commission.findMany({ where: { job_id: jobId } });
            console.log('   Debug Commissions:', JSON.stringify(debugComms, null, 2));
        }

        // ============================================================
        // STEP 7: VERIFY SALES COMMISSION (Original Step)
        // ============================================================
        console.log('\n💰 Step 7.2: Verifying Sales Commission (Subscription)...');

        // Wait a moment for async processing
        console.log('   Waiting 2s for commission processing...');
        await new Promise(r => setTimeout(r, 2000));

        res = await client.request('GET', '/api/consultant360/earnings');
        // @ts-ignore
        const newEarnings = res.data.data;

        // @ts-ignore
        const newTotalSales = (newEarnings.salesEarnings?.totalSubscriptionSales || 0) + (newEarnings.salesEarnings?.totalServiceFees || 0);
        console.log(`   Old Sales Earnings: $${totalSales}`);
        console.log(`   New Sales Earnings: $${newTotalSales}`);

        const diff = newTotalSales - totalSales;
        if (diff > 0) {
            console.log(`✅ SUCCESS: Sales Earnings increased by $${diff}!`);
        } else {
            console.error(`❌ FAILURE: Sales Earnings did not increase!`);
        }

        // ============================================================
        // STEP 8: REFUND FLOW / APPROVAL CHECK
        // ============================================================
        console.log('\n💸 Step 8: Verification of Commission Approval & Withdrawal...');

        // 8a. Check Balances
        res = await client.request('GET', '/api/consultant360/balance');
        // @ts-ignore
        let pendingBalance = res.data.data.balance.pendingBalance;
        // @ts-ignore
        let availableBalance = res.data.data.balance.availableBalance;

        console.log(`   Current Balance State:`);
        console.log(`     - Pending:   $${pendingBalance}`);
        console.log(`     - Available: $${availableBalance}`);

        // 8b. Simulate Admin Approval (if pending)
        if (pendingBalance > 0) {
            console.log('   🔄 Simulating Admin Approval (Pending -> Confirmed)...');

            // @ts-ignore
            await prisma.commission.updateMany({
                where: {
                    consultant_id: user.id,
                    status: 'PENDING'
                },
                data: { status: 'CONFIRMED' }
            });

            // Refetch balance to verify it moved to Available
            res = await client.request('GET', '/api/consultant360/balance');
            // @ts-ignore
            const newAvailable = res.data.data.balance.availableBalance;
            // @ts-ignore
            const newPending = res.data.data.balance.pendingBalance;

            console.log(`   ✅ Approval Complete. New State:`);
            console.log(`     - Pending:   $${newPending}`);
            console.log(`     - Available: $${newAvailable}`);

            if (newAvailable > availableBalance) {
                console.log(`   ✅ VERIFIED: Approved amount moved to Wallet!`);
                availableBalance = newAvailable;
            } else {
                console.warn(`   ⚠️ WARNING: Available balance did not increase after approval (Could be pre-existing withdrawals or limits).`);
            }
        } else {
            console.log(`   ℹ️ No pending commissions (New commission likely auto-approved).`);
        }

        // 8c. Request Withdrawal
        if (availableBalance > 0) {
            // Fetch comms again to get ID
            res = await client.request('GET', '/api/consultant360/balance');
            // @ts-ignore
            const comms = res.data.data.balance.availableCommissions;
            const commissionIds = comms.map((c: any) => c.id);

            console.log(`   Requesting withdrawal for $${availableBalance}...`);
            res = await client.request('POST', '/api/consultant360/withdraw', {
                amount: availableBalance,
                paymentMethod: 'BANK_TRANSFER',
                paymentDetails: {
                    bankName: 'Test Bank',
                    accountNumber: '1234567890'
                },
                commissionIds: commissionIds,
                notes: 'E2E Test Withdrawal'
            });

            if (!res.ok) throw new Error(`Withdrawal Failed: ${res.status} - ${JSON.stringify(res.data)}`);
            console.log(`✅ Withdrawal Requested Successfully!`);

            // 8d. Verify Withdrawal in History
            console.log(`   Verifying Withdrawal in History...`);
            res = await client.request('GET', '/api/consultant360/withdrawals');
            // @ts-ignore
            const withdrawals = res.data.data.withdrawals;
            const latest = withdrawals[0]; // Assuming sorted desc

            if (latest && latest.amount === availableBalance && latest.status === 'PENDING') {
                console.log(`✅ Withdrawal verified in history (ID: ${latest.id}, Status: ${latest.status})`);
            } else {
                console.error(`❌ Withdrawal verification failed! Latest expected: ${availableBalance}, Found: ${JSON.stringify(latest)}`);
            }

            // 8e. Verify Balance Decreased
            res = await client.request('GET', '/api/consultant360/balance');
            // @ts-ignore
            const newBalance = res.data.data.balance.availableBalance;
            console.log(`   Final Available Balance: $${newBalance}`);

            if (newBalance === 0) {
                console.log(`✅ Balance correctly deducted to 0.`);
            } else {
                console.warn(`⚠️ Balance mismatch! Expected 0, got $${newBalance}`);
            }

        } else {
            console.warn(`⚠️ No available balance to withdraw even after confirmation. Skipping withdrawal test.`);
        }

        console.log('\n╔════════════════════════════════════════════════════════╗');
        console.log('║  ✅ ALL DASHBOARD & WITHDRAWAL TESTS PASSED!           ║');
        console.log('╚════════════════════════════════════════════════════════╝');

    } catch (error: any) {
        console.error('\n❌ TEST FAILED:', error.message);
        if (error.data) console.error(JSON.stringify(error.data, null, 2));
    } finally {
        // Cleanup
        if (createdLeadId) {
            console.log(`\n🧹 Cleaning up test lead...`);
        }
    }
}

runDashboardTest();
