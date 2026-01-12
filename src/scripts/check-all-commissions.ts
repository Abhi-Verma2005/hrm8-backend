/**
 * Check all commissions for abhi.sales@gmail.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAllCommissions() {
    console.log('🔍 Checking all commissions for abhi.sales@gmail.com...\n');

    // Find the sales agent
    const agent = await prisma.consultant.findFirst({
        where: {
            email: 'abhi.sales@gmail.com'
        },
        select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            default_commission_rate: true,
            region_id: true
        }
    });

    if (!agent) {
        console.log('❌ Sales agent not found');
        return;
    }

    console.log(`👤 Sales Agent: ${agent.first_name} ${agent.last_name} (${agent.email})`);
    console.log(`   ID: ${agent.id}`);
    console.log(`   Commission Rate: ${(agent.default_commission_rate || 0.10) * 100}%`);
    console.log(`   Region: ${agent.region_id}\n`);

    // Get all companies attributed to this agent
    const companies = await prisma.company.findMany({
        where: {
            sales_agent_id: agent.id
        },
        include: {
            jobs: {
                include: {
                    commissions: {
                        where: {
                            type: 'SUBSCRIPTION_SALE'
                        }
                    }
                }
            }
        }
    });

    console.log(`🏢 Companies: ${companies.length}\n`);

    let totalCommissionsExpected = 0;
    let totalCommissionsCreated = 0;
    let jobsNeedingCommissions: any[] = [];

    for (const company of companies) {
        console.log(`\n📊 ${company.name}`);
        console.log(`   Jobs: ${company.jobs.length}`);

        for (const job of company.jobs) {
            const isPaidService = job.service_package !== 'self-managed' && job.service_package;
            const isPaid = job.payment_status === 'PAID';

            if (isPaidService && isPaid) {
                totalCommissionsExpected++;

                const salesCommission = job.commissions.find(c => c.type === 'SUBSCRIPTION_SALE');

                console.log(`   - ${job.title || 'Untitled'} (${job.service_package})`);
                console.log(`     Payment: ${job.payment_status}`);
                console.log(`     Commission: ${salesCommission ? `$${salesCommission.amount} (${salesCommission.status})` : '❌ MISSING'}`);

                if (salesCommission) {
                    totalCommissionsCreated++;
                } else {
                    jobsNeedingCommissions.push({ job, company });
                }
            }
        }
    }

    console.log(`\n📈 Summary:`);
    console.log(`   Expected Commissions: ${totalCommissionsExpected}`);
    console.log(`   Created Commissions: ${totalCommissionsCreated}`);
    console.log(`   Missing Commissions: ${totalCommissionsExpected - totalCommissionsCreated}`);

    // Create missing commissions
    if (jobsNeedingCommissions.length > 0) {
        console.log(`\n🔧 Creating ${jobsNeedingCommissions.length} missing commissions...\n`);

        for (const { job, company } of jobsNeedingCommissions) {
            console.log(`Creating commission for job: ${job.title}`);

            // Try to get payment amount from Stripe
            let paymentAmount = 0;

            if (job.stripe_session_id) {
                try {
                    const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
                    const session = await stripe.checkout.sessions.retrieve(job.stripe_session_id);
                    paymentAmount = (session.amount_total || 0) / 100;
                    console.log(`  Payment from Stripe: $${paymentAmount}`);
                } catch (e) {
                    console.log(`  Could not retrieve Stripe session`);
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
                console.log(`  Using default price: $${paymentAmount}`);
            }

            if (paymentAmount > 0 && company.region_id) {
                const commissionRate = agent.default_commission_rate || 0.10;
                const commissionAmount = Math.round(paymentAmount * commissionRate * 100) / 100;

                const commission = await prisma.commission.create({
                    data: {
                        consultant_id: agent.id,
                        region_id: company.region_id,
                        job_id: job.id,
                        type: 'SUBSCRIPTION_SALE',
                        amount: commissionAmount,
                        rate: commissionRate,
                        status: 'CONFIRMED',
                        description: `Sales commission for ${job.service_package} service - $${paymentAmount}`
                    }
                });

                console.log(`  ✅ Created commission: $${commissionAmount}\n`);
            } else {
                console.log(`  ⚠️  Cannot create: Missing payment amount or region\n`);
            }
        }
    }

    // Show final commission list
    console.log(`\n💰 All Commissions for ${agent.email}:`);
    const allCommissions = await prisma.commission.findMany({
        where: {
            consultant_id: agent.id,
            type: 'SUBSCRIPTION_SALE'
        },
        include: {
            job: {
                select: {
                    title: true,
                    service_package: true,
                    company: {
                        select: {
                            name: true
                        }
                    }
                }
            }
        },
        orderBy: {
            created_at: 'desc'
        }
    });

    console.log(`\nTotal: ${allCommissions.length} commissions`);
    let totalAmount = 0;

    allCommissions.forEach((comm, i) => {
        console.log(`\n${i + 1}. ${comm.job?.company?.name || 'Unknown'} - ${comm.job?.title || 'Untitled'}`);
        console.log(`   Amount: $${comm.amount}`);
        console.log(`   Status: ${comm.status}`);
        console.log(`   Rate: ${comm.rate * 100}%`);
        console.log(`   Created: ${comm.created_at.toISOString()}`);
        totalAmount += comm.amount;
    });

    console.log(`\n💵 Total Commission Amount: $${totalAmount.toFixed(2)}`);
    console.log(`   Available (CONFIRMED): $${allCommissions.filter(c => c.status === 'CONFIRMED').reduce((sum, c) => sum + c.amount, 0).toFixed(2)}`);
}

checkAllCommissions()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
