import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log(`\n=== REVENUE DATA CHECK ===`);

    // 1. Check RegionalRevenue table
    const revenueRecords = await prisma.regionalRevenue.findMany({
        take: 5,
        include: { region: { select: { name: true } } }
    });

    console.log(`\n[1] RegionalRevenue Table: ${revenueRecords.length} records found`);
    if (revenueRecords.length > 0) {
        revenueRecords.forEach(r => {
            console.log(`  - Region: ${r.region?.name}, Total: $${r.total_revenue}, Status: ${r.status}`);
        });
    } else {
        console.log('  ❌ EMPTY - This table stores pre-computed revenue aggregates.');
    }

    // 2. Check Companies with actual revenue (Jobs/Subscriptions)
    const companiesWithRevenue = await prisma.company.findMany({
        where: {
            OR: [
                { jobs: { some: { payment_status: 'PAID' } } },
                { subscription: { some: { bill: { some: { status: 'PAID' } } } } }
            ]
        },
        include: {
            region: { select: { name: true } },
            jobs: {
                where: { payment_status: 'PAID' },
                select: { payment_amount: true }
            },
            subscription: {
                include: {
                    bill: {
                        where: { status: 'PAID' },
                        select: { amount: true }
                    }
                }
            }
        },
        take: 10
    });

    console.log(`\n[2] Companies with Paid Jobs/Subscriptions: ${companiesWithRevenue.length} found`);
    companiesWithRevenue.forEach(c => {
        const jobRev = c.jobs.reduce((sum, j) => sum + (j.payment_amount || 0), 0);
        let subRev = 0;
        c.subscription.forEach(s => {
            subRev += s.bill.reduce((sum, b) => sum + (b.amount || 0), 0);
        });
        console.log(`  - ${c.name} (${c.region?.name}): Jobs=$${jobRev}, Subs=$${subRev}, Total=$${jobRev + subRev}`);
    });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
