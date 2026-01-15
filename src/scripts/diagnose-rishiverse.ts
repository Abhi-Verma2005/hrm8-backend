/**
 * Diagnostic Script: Check rishiverse company and create missing commissions
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseAndFix() {
    console.log('🔍 Diagnosing rishiverse company...\n');

    // Find the company
    const company = await prisma.company.findFirst({
        where: {
            name: {
                contains: 'rishiverse',
                mode: 'insensitive'
            }
        },
        include: {
            sales_agent: {
                select: {
                    id: true,
                    email: true,
                    default_commission_rate: true
                }
            },
            subscription: true,
            jobs: {
                include: {
                    commissions: true
                }
            }
        }
    });

    if (!company) {
        console.log('❌ Rishiverse company not found');
        return;
    }

    console.log(`📊 Company: ${company.name}`);
    console.log(`   ID: ${company.id}`);
    console.log(`   Sales Agent: ${company.sales_agent?.email || 'None'} (${company.sales_agent_id})`);
    console.log(`   Region: ${company.region_id}`);
    console.log(`   Attribution Locked: ${company.attribution_locked}`);
    console.log(`\n📦 Subscriptions: ${company.subscription.length}`);

    company.subscription.forEach(sub => {
        console.log(`   - ${sub.plan_type}: ${sub.status} (${sub.start_date} to ${sub.renewal_date})`);
    });

    console.log(`\n💼 Jobs: ${company.jobs.length}`);

    let jobsNeedingCommissions: any[] = [];

    for (const job of company.jobs) {
        console.log(`\n   Job: ${job.title || 'Untitled'}`);
        console.log(`   - ID: ${job.id}`);
        console.log(`   - Service Package: ${job.service_package}`);
        console.log(`   - Payment Status: ${job.payment_status}`);
        console.log(`   - Stripe Session: ${job.stripe_session_id || 'None'}`);
        console.log(`   - Existing Commissions: ${job.commissions.length}`);

        if (job.commissions.length > 0) {
            job.commissions.forEach(comm => {
                console.log(`     * ${comm.type}: $${comm.amount} (${comm.status})`);
            });
        }

        // Check if this job needs a commission
        if (
            job.payment_status === 'PAID' &&
            job.service_package !== 'self-managed' &&
            company.sales_agent_id &&
            company.region_id
        ) {
            const hasCommission = job.commissions.some(c => c.type === 'SUBSCRIPTION_SALE');
            if (!hasCommission) {
                console.log(`   ⚠️  MISSING COMMISSION!`);
                jobsNeedingCommissions.push(job);
            }
        }
    }

    // Create missing commissions
    if (jobsNeedingCommissions.length > 0) {
        console.log(`\n🔧 Creating ${jobsNeedingCommissions.length} missing commissions...\n`);

        for (const job of jobsNeedingCommissions) {
            // Calculate commission amount
            // We need to get the payment amount from somewhere
            // Let's try to get it from the Stripe session or use a default based on package

            let paymentAmount = 0;

            // Try to get from Stripe session
            if (job.stripe_session_id) {
                try {
                    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
                    const session = await stripe.checkout.sessions.retrieve(job.stripe_session_id);
                    paymentAmount = (session.amount_total || 0) / 100;
                    console.log(`   Retrieved payment amount from Stripe: $${paymentAmount}`);
                } catch (e: any) {
                    console.log(`   Could not retrieve Stripe session: ${e.message}`);
                }
            }

            // Fallback to package defaults
            if (paymentAmount === 0) {
                const packagePrices: Record<string, number> = {
                    'shortlisting': 999,
                    'full-service': 2499,
                    'executive-search': 4999
                };
                paymentAmount = packagePrices[job.service_package] || 0;
                console.log(`   Using default package price: $${paymentAmount}`);
            }

            if (paymentAmount > 0) {
                const commissionRate = company.sales_agent?.default_commission_rate || 0.10;
                const commissionAmount = Math.round(paymentAmount * commissionRate * 100) / 100;

                const commission = await prisma.commission.create({
                    data: {
                        consultant_id: company.sales_agent_id!,
                        region_id: company.region_id!,
                        job_id: job.id,
                        type: 'SUBSCRIPTION_SALE',
                        amount: commissionAmount,
                        rate: commissionRate,
                        status: 'CONFIRMED',
                        description: `Sales commission for ${job.service_package} service - $${paymentAmount}`
                    }
                });

                console.log(`   ✅ Created commission ${commission.id}: $${commissionAmount} (${commissionRate * 100}% of $${paymentAmount})`);
            } else {
                console.log(`   ⚠️  Could not determine payment amount for job ${job.id}`);
            }
        }
    } else {
        console.log(`\n✅ No missing commissions found`);
    }

    console.log('\n✅ Diagnosis complete!');
}

diagnoseAndFix()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
