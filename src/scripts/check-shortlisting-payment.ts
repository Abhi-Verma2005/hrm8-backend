/**
 * Check the shortlisting job payment details
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkShortlistingJob() {
    console.log('🔍 Checking "i am anugra" shortlisting job...\n');

    const job = await prisma.job.findFirst({
        where: {
            title: {
                contains: 'i am anugra',
                mode: 'insensitive'
            },
            service_package: 'shortlisting'
        },
        include: {
            company: {
                select: {
                    id: true,
                    name: true,
                    sales_agent_id: true,
                    region_id: true,
                    sales_agent: {
                        select: {
                            email: true,
                            default_commission_rate: true
                        }
                    },
                    attribution_locked: true
                }
            },
            commissions: true
        }
    });

    if (!job) {
        console.log('❌ Shortlisting job not found');
        return;
    }

    console.log(`📋 Job Details:`);
    console.log(`   ID: ${job.id}`);
    console.log(`   Title: ${job.title}`);
    console.log(`   Service Package: ${job.service_package}`);
    console.log(`   Payment Status: ${job.payment_status}`);
    console.log(`   Stripe Session ID: ${job.stripe_session_id || 'None'}`);
    console.log(`   Payment Completed At: ${job.payment_completed_at || 'Not completed'}`);

    console.log(`\n🏢 Company Details:`);
    console.log(`   Name: ${job.company.name}`);
    console.log(`   Sales Agent: ${job.company.sales_agent?.email || 'None'}`);
    console.log(`   Sales Agent ID: ${job.company.sales_agent_id || 'None'}`);
    console.log(`   Region ID: ${job.company.region_id || 'None'}`);

    console.log(`\n💰 Commissions: ${job.commissions.length}`);
    if (job.commissions.length > 0) {
        job.commissions.forEach(comm => {
            console.log(`   - Type: ${comm.type}`);
            console.log(`     Amount: $${comm.amount}`);
            console.log(`     Status: ${comm.status}`);
            console.log(`     Rate: ${(comm.rate || 0) * 100}%`);
        });
    }

    // Check Stripe session if exists
    if (job.stripe_session_id) {
        console.log(`\n💳 Checking Stripe Session...`);
        try {
            const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
            const session = await stripe.checkout.sessions.retrieve(job.stripe_session_id);

            console.log(`   Session Status: ${session.status}`);
            console.log(`   Payment Status: ${session.payment_status}`);
            console.log(`   Amount Total: $${(session.amount_total || 0) / 100}`);
            console.log(`   Currency: ${session.currency}`);
            console.log(`   Payment Intent: ${session.payment_intent || 'None'}`);

            if (session.payment_intent) {
                const paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent);
                console.log(`\n   Payment Intent Details:`);
                console.log(`     Status: ${paymentIntent.status}`);
                console.log(`     Amount: $${paymentIntent.amount / 100}`);
                console.log(`     Created: ${new Date(paymentIntent.created * 1000).toISOString()}`);
            }

            // Check if payment was successful but job not updated
            if (session.payment_status === 'paid' && job.payment_status !== 'PAID') {
                console.log(`\n⚠️  ISSUE FOUND: Stripe shows PAID but job status is ${job.payment_status}`);
                console.log(`   This means the webhook or verification endpoint didn't update the job.`);

                // Manually update the job and create commission
                console.log(`\n🔧 Fixing job status and creating commission...`);

                const paymentAmount = (session.amount_total || 0) / 100;

                // Update job
                await prisma.job.update({
                    where: { id: job.id },
                    data: {
                        payment_status: 'PAID',
                        stripe_payment_intent_id: session.payment_intent as string,
                        payment_completed_at: new Date()
                    }
                });
                console.log(`   ✅ Updated job payment status to PAID`);

                // Create commission if not exists and company has required fields
                if (job.commissions.length === 0 && job.company.sales_agent_id && job.company.region_id) {
                    const commissionRate = job.company.sales_agent?.default_commission_rate || 0.10;
                    const commissionAmount = Math.round(paymentAmount * commissionRate * 100) / 100;

                    await prisma.commission.create({
                        data: {
                            consultant_id: job.company.sales_agent_id,
                            region_id: job.company.region_id,
                            job_id: job.id,
                            type: 'SUBSCRIPTION_SALE',
                            amount: commissionAmount,
                            rate: commissionRate,
                            status: 'CONFIRMED',
                            description: `Sales commission for ${job.service_package} service - $${paymentAmount}`
                        }
                    });

                    console.log(`   ✅ Created commission: $${commissionAmount} (${commissionRate * 100}% of $${paymentAmount})`);

                    // Lock attribution
                    if (!job.company.attribution_locked) {
                        await prisma.company.update({
                            where: { id: job.company.id },
                            data: {
                                attribution_locked: true,
                                attribution_locked_at: new Date()
                            }
                        });
                        console.log(`   ✅ Locked attribution for 12-month commission period`);
                    }
                } else if (job.commissions.length > 0) {
                    console.log(`   ℹ️  Commission already exists`);
                } else {
                    console.log(`   ⚠️  Cannot create commission: Missing sales_agent_id or region_id`);
                }
            } else if (session.payment_status === 'paid' && job.payment_status === 'PAID') {
                console.log(`\n✅ Payment is complete and job is correctly marked as PAID`);

                if (job.commissions.length === 0 && job.company.sales_agent_id && job.company.region_id) {
                    console.log(`\n⚠️  But commission is missing! Creating it now...`);

                    const paymentAmount = (session.amount_total || 0) / 100;
                    const commissionRate = job.company.sales_agent?.default_commission_rate || 0.10;
                    const commissionAmount = Math.round(paymentAmount * commissionRate * 100) / 100;

                    await prisma.commission.create({
                        data: {
                            consultant_id: job.company.sales_agent_id,
                            region_id: job.company.region_id,
                            job_id: job.id,
                            type: 'SUBSCRIPTION_SALE',
                            amount: commissionAmount,
                            rate: commissionRate,
                            status: 'CONFIRMED',
                            description: `Sales commission for ${job.service_package} service - $${paymentAmount}`
                        }
                    });

                    console.log(`   ✅ Created missing commission: $${commissionAmount}`);
                }
            } else {
                console.log(`\n⏳ Payment is still ${session.payment_status}`);
            }

        } catch (error: any) {
            console.log(`   ❌ Error checking Stripe: ${error.message}`);
        }
    } else {
        console.log(`\n⚠️  No Stripe session found - payment may not have been initiated`);
    }
}

checkShortlistingJob()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
