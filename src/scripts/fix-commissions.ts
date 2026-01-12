/**
 * Data Fix Script: Update existing commissions and sync company fields
 * Run this once to fix data for existing sales agents
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixCommissionsAndCompanies() {
    console.log('🔧 Starting data fix...\n');

    // 1. Update all PENDING commissions to CONFIRMED for paid jobs
    console.log('1️⃣ Updating PENDING commissions to CONFIRMED for paid jobs...');
    const updatedCommissions = await prisma.commission.updateMany({
        where: {
            status: 'PENDING',
            type: 'SUBSCRIPTION_SALE',
            job: {
                payment_status: 'PAID'
            }
        },
        data: {
            status: 'CONFIRMED'
        }
    });
    console.log(`✅ Updated ${updatedCommissions.count} commissions to CONFIRMED\n`);

    // 2. Sync referred_by and sales_agent_id fields
    console.log('2️⃣ Syncing referred_by and sales_agent_id fields...');

    // Find companies where fields don't match
    const companies = await prisma.company.findMany({
        where: {
            OR: [
                {
                    AND: [
                        { referred_by: { not: null } },
                        { sales_agent_id: null }
                    ]
                },
                {
                    AND: [
                        { sales_agent_id: { not: null } },
                        { referred_by: null }
                    ]
                }
            ]
        },
        select: {
            id: true,
            name: true,
            referred_by: true,
            sales_agent_id: true
        }
    });

    console.log(`Found ${companies.length} companies with mismatched fields`);

    for (const company of companies) {
        const agentId = company.sales_agent_id || company.referred_by;
        if (agentId) {
            await prisma.company.update({
                where: { id: company.id },
                data: {
                    referred_by: agentId,
                    sales_agent_id: agentId
                }
            });
            console.log(`✅ Synced ${company.name}: both fields now set to ${agentId}`);
        }
    }

    console.log('\n3️⃣ Checking specific case: rishiverse...');
    const rishiverse = await prisma.company.findFirst({
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
                    email: true
                }
            },
            subscription: {
                where: { status: 'ACTIVE' },
                take: 1
            },
            jobs: {
                where: { payment_status: 'PAID' },
                select: {
                    id: true,
                    title: true,
                    payment_status: true,
                    service_package: true
                }
            }
        }
    });

    if (rishiverse) {
        console.log(`\n📊 Rishiverse Company Details:`);
        console.log(`   ID: ${rishiverse.id}`);
        console.log(`   Name: ${rishiverse.name}`);
        console.log(`   Sales Agent: ${rishiverse.sales_agent?.email || 'None'}`);
        console.log(`   Referred By: ${rishiverse.referred_by || 'None'}`);
        console.log(`   Sales Agent ID: ${rishiverse.sales_agent_id || 'None'}`);
        console.log(`   Active Subscriptions: ${rishiverse.subscription.length}`);
        console.log(`   Paid Jobs: ${rishiverse.jobs.length}`);

        if (rishiverse.jobs.length > 0) {
            console.log(`\n   Job Details:`);
            rishiverse.jobs.forEach(job => {
                console.log(`   - ${job.title} (${job.service_package}) - ${job.payment_status}`);
            });

            // Check commissions for these jobs
            const commissions = await prisma.commission.findMany({
                where: {
                    job_id: {
                        in: rishiverse.jobs.map(j => j.id)
                    },
                    type: 'SUBSCRIPTION_SALE'
                },
                include: {
                    consultant: {
                        select: {
                            email: true
                        }
                    }
                }
            });

            console.log(`\n   Commissions: ${commissions.length}`);
            commissions.forEach(comm => {
                console.log(`   - ${comm.consultant?.email}: $${comm.amount} (${comm.status})`);
            });
        }
    } else {
        console.log('⚠️  Rishiverse company not found');
    }

    console.log('\n✅ Data fix complete!');
}

fixCommissionsAndCompanies()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
