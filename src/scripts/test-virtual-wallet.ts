/**
 * End-to-End Test Script for Virtual Wallet & Subscription System
 * 
 * This script simulates the complete flow:
 * 1. Create a test company account
 * 2. Purchase a subscription (SMALL plan - $295, 5 jobs)
 * 3. Create virtual wallet account and credit balance
 * 4. Post multiple jobs (3 jobs) and deduct from wallet
 * 5. Verify wallet balance and subscription usage
 * 6. Clean up all test data
 * 
 * Run with: pnpm tsx src/scripts/test-virtual-wallet.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Test data IDs for cleanup
const testData = {
    companyId: '',
    userId: '',
    subscriptionId: '',
    virtualAccountId: '',
    jobIds: [] as string[],
    transactionIds: [] as string[],
};

async function cleanup() {
    console.log('\n🧹 Cleaning up test data...');

    try {
        // Delete in correct order due to foreign keys
        if (testData.jobIds.length > 0) {
            await prisma.job.deleteMany({
                where: { id: { in: testData.jobIds } }
            });
            console.log(`✓ Deleted ${testData.jobIds.length} test jobs`);
        }

        if (testData.transactionIds.length > 0) {
            await prisma.virtualTransaction.deleteMany({
                where: { id: { in: testData.transactionIds } }
            });
            console.log(`✓ Deleted ${testData.transactionIds.length} virtual transactions`);
        }

        if (testData.virtualAccountId) {
            await prisma.virtualAccount.delete({
                where: { id: testData.virtualAccountId }
            });
            console.log('✓ Deleted virtual account');
        }

        if (testData.subscriptionId) {
            await prisma.subscription.delete({
                where: { id: testData.subscriptionId }
            });
            console.log('✓ Deleted subscription');
        }

        if (testData.userId) {
            await prisma.user.delete({
                where: { id: testData.userId }
            });
            console.log('✓ Deleted test company user');
        }

        if (testData.companyId) {
            await prisma.company.delete({
                where: { id: testData.companyId }
            });
            console.log('✓ Deleted test company');
        }

        console.log('✅ Cleanup complete!\n');
    } catch (error) {
        console.error('❌ Error during cleanup:', error);
        throw error;
    }
}

async function createTestCompany() {
    console.log('\n🏢 Step 1: Creating test company...');

    const company = await prisma.company.create({
        data: {
            name: 'Test Company (Virtual Wallet E2E)',
            website: 'https://test-company-wallet.example.com',
            domain: `test-wallet-${Date.now()}.com`,
            country_or_region: 'US',
            accepted_terms: true,
        }
    });

    testData.companyId = company.id;
    console.log(`✓ Company created: ${company.name} (ID: ${company.id})`);

    // Find the existing rdx.omega user from HRM8User table (global admin)
    const hrm8User = await prisma.hRM8User.findUnique({
        where: { email: 'rdx.omega2678@gmail.com' }
    });

    if (!hrm8User) {
        throw new Error('rdx.omega2678@gmail.com user not found in HRM8User table. Please ensure the global admin exists.');
    }

    console.log(`✓ Found HRM8 global admin: ${hrm8User.email}`);

    // Create a test User for the company (needed for Job.created_by foreign key)
    const companyUser = await prisma.user.create({
        data: {
            email: `test-user-${Date.now()}@test-wallet.com`,
            name: 'Test Company User',
            password_hash: 'test_hash',  // Not used, just for FK
            company_id: company.id,
            role: 'ADMIN',  // Using valid UserRole enum
            status: 'ACTIVE',
        }
    });

    testData.userId = companyUser.id;
    console.log(`✓ Created test company user: ${companyUser.email} (ID: ${companyUser.id})`);

    return { company, user: companyUser };
}

async function purchaseSubscription(companyId: string) {
    console.log('\n💳 Step 2: Purchasing SMALL subscription ($295, 5 jobs)...');

    const subscription = await prisma.subscription.create({
        data: {
            company_id: companyId,
            name: 'SMALL Plan',
            plan_type: 'BASIC', // Using existing enum value
            status: 'ACTIVE',
            base_price: 295,
            currency: 'USD',
            billing_cycle: 'MONTHLY',
            start_date: new Date(),
            renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
            job_quota: 5,
            jobs_used: 0,
            prepaid_balance: 295,
            auto_renew: true,
        }
    });

    testData.subscriptionId = subscription.id;
    console.log(`✓ Subscription created: ${subscription.name}`);
    console.log(`  - Price: $${subscription.base_price}`);
    console.log(`  - Job Quota: ${subscription.job_quota}`);
    console.log(`  - Jobs Used: ${subscription.jobs_used}`);
    console.log(`  - Prepaid Balance: $${subscription.prepaid_balance}`);

    return subscription;
}

async function createVirtualWallet(companyId: string, initialBalance: number) {
    console.log(`\n💰 Step 3: Creating virtual wallet with $${initialBalance} balance...`);

    const virtualAccount = await prisma.virtualAccount.create({
        data: {
            owner_type: 'COMPANY',
            owner_id: companyId,
            balance: initialBalance,
            total_credits: initialBalance,
            total_debits: 0,
            status: 'ACTIVE',
        }
    });

    testData.virtualAccountId = virtualAccount.id;
    console.log(`✓ Virtual account created (ID: ${virtualAccount.id})`);
    console.log(`  - Owner: COMPANY`);
    console.log(`  - Balance: $${virtualAccount.balance}`);
    console.log(`  - Status: ${virtualAccount.status}`);

    // Create initial credit transaction
    const creditTransaction = await prisma.virtualTransaction.create({
        data: {
            virtual_account_id: virtualAccount.id,
            type: 'SUBSCRIPTION_PURCHASE',
            amount: initialBalance,
            balance_after: initialBalance,
            direction: 'CREDIT',
            description: 'Initial subscription purchase credit',
            reference_type: 'SUBSCRIPTION',
            status: 'COMPLETED',
        }
    });

    testData.transactionIds.push(creditTransaction.id);
    console.log(`✓ Initial credit transaction created: +$${creditTransaction.amount}`);

    return virtualAccount;
}

async function postJob(
    companyId: string,
    userId: string,
    virtualAccountId: string,
    subscriptionId: string,
    jobNumber: number,
    jobCost: number
) {
    console.log(`\n📝 Step 4.${jobNumber}: Posting job #${jobNumber}...`);

    // Get current virtual account balance
    const account = await prisma.virtualAccount.findUnique({
        where: { id: virtualAccountId }
    });

    if (!account) {
        throw new Error('Virtual account not found');
    }

    if (account.balance < jobCost) {
        throw new Error(`Insufficient balance: $${account.balance} < $${jobCost}`);
    }

    // Create job
    const job = await prisma.job.create({
        data: {
            company_id: companyId,
            created_by: userId,
            title: `Test Job #${jobNumber} - Virtual Wallet E2E`,
            description: `This is a test job posting #${jobNumber} for end-to-end wallet testing`,
            location: 'Remote',
            status: 'OPEN',
            employment_type: 'FULL_TIME',
            work_arrangement: 'REMOTE',
            posting_date: new Date(),
        }
    });

    testData.jobIds.push(job.id);
    console.log(`✓ Job created: ${job.title} (ID: ${job.id})`);

    // Debit from virtual account
    const newBalance = account.balance - jobCost;
    await prisma.virtualAccount.update({
        where: { id: virtualAccountId },
        data: {
            balance: newBalance,
            total_debits: account.total_debits + jobCost,
        }
    });

    // Create debit transaction
    const debitTransaction = await prisma.virtualTransaction.create({
        data: {
            virtual_account_id: virtualAccountId,
            type: 'JOB_POSTING_DEDUCTION',
            amount: jobCost,
            balance_after: newBalance,
            direction: 'DEBIT',
            description: `Job posting charge for: ${job.title}`,
            reference_type: 'JOB',
            reference_id: job.id,
            job_id: job.id,
            status: 'COMPLETED',
        }
    });

    testData.transactionIds.push(debitTransaction.id);
    console.log(`✓ Virtual wallet debited: -$${jobCost}`);
    console.log(`  - New balance: $${newBalance}`);

    // Update subscription usage
    const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId }
    });

    if (subscription) {
        await prisma.subscription.update({
            where: { id: subscriptionId },
            data: {
                jobs_used: subscription.jobs_used + 1,
                prepaid_balance: newBalance,
            }
        });

        console.log(`✓ Subscription updated: ${subscription.jobs_used + 1}/${subscription.job_quota} jobs used`);
    }

    return { job, newBalance };
}

async function verifyFinalState(virtualAccountId: string, subscriptionId: string) {
    console.log('\n✅ Step 5: Verifying final state...');

    // Get virtual account
    const account = await prisma.virtualAccount.findUnique({
        where: { id: virtualAccountId },
        include: {
            transactions: {
                orderBy: { created_at: 'desc' }
            }
        }
    });

    if (!account) {
        throw new Error('Virtual account not found');
    }

    console.log('\n💰 Virtual Account Summary:');
    console.log(`  - Balance: $${account.balance}`);
    console.log(`  - Total Credits: $${account.total_credits}`);
    console.log(`  - Total Debits: $${account.total_debits}`);
    console.log(`  - Calculated Balance: $${account.total_credits - account.total_debits}`);
    console.log(`  - Status: ${account.status}`);

    // Verify balance integrity
    const calculatedBalance = account.total_credits - account.total_debits;
    if (Math.abs(account.balance - calculatedBalance) > 0.01) {
        console.error(`❌ BALANCE MISMATCH! Balance: $${account.balance}, Calculated: $${calculatedBalance}`);
        throw new Error('Balance integrity check failed');
    } else {
        console.log('  ✓ Balance integrity verified');
    }

    console.log(`\n📊 Transaction History (${account.transactions.length} transactions):`);
    account.transactions.forEach((txn, idx) => {
        const sign = txn.direction === 'CREDIT' ? '+' : '-';
        console.log(`  ${idx + 1}. ${txn.type}: ${sign}$${txn.amount} -> Balance: $${txn.balance_after}`);
    });

    // Get subscription
    const subscription = await prisma.subscription.findUnique({
        where: { id: subscriptionId }
    });

    if (subscription) {
        console.log('\n📦 Subscription Summary:');
        console.log(`  - Plan: ${subscription.name}`);
        console.log(`  - Price: $${subscription.base_price}`);
        console.log(`  - Job Quota: ${subscription.job_quota}`);
        console.log(`  - Jobs Used: ${subscription.jobs_used}`);
        console.log(`  - Jobs Remaining: ${(subscription.job_quota || 0) - subscription.jobs_used}`);
        console.log(`  - Prepaid Balance: $${subscription.prepaid_balance}`);
        console.log(`  - Status: ${subscription.status}`);
    }

    return { account, subscription };
}

async function main() {
    console.log('🚀 Starting End-to-End Virtual Wallet Test\n');
    console.log('This test will:');
    console.log('  1. Create a test company and user for job posting');
    console.log('  2. Purchase a SMALL subscription ($295, 5 jobs)');
    console.log('  3. Create virtual wallet with $295 balance');
    console.log('  4. Post 3 jobs (deducting $59 each)');
    console.log('  5. Verify final balances and usage');
    console.log('  6. Clean up all test data\n');

    try {
        // Step 1: Create test company and user
        const { company, user } = await createTestCompany();

        // Step 2: Purchase subscription
        const subscription = await purchaseSubscription(company.id);

        // Step 3: Create virtual wallet
        const virtualAccount = await createVirtualWallet(company.id, subscription.base_price);

        // Step 4: Post 3 jobs (deduct $59 each)
        const jobCost = subscription.base_price / (subscription.job_quota || 1); // $295 / 5 = $59
        console.log(`\n💵 Per-job cost: $${jobCost.toFixed(2)}`);

        await postJob(company.id, user.id, virtualAccount.id, subscription.id, 1, jobCost);
        await postJob(company.id, user.id, virtualAccount.id, subscription.id, 2, jobCost);
        await postJob(company.id, user.id, virtualAccount.id, subscription.id, 3, jobCost);

        // Step 5: Verify final state
        await verifyFinalState(virtualAccount.id, subscription.id);

        console.log('\n✅ All tests passed successfully!');

        // Step 6: Cleanup
        await cleanup();

        console.log('🎉 End-to-End test completed successfully!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Test failed with error:', error);

        // Attempt cleanup even on failure
        try {
            await cleanup();
        } catch (cleanupError) {
            console.error('Failed to cleanup after error:', cleanupError);
        }

        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

// Run the test
main();
