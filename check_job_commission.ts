
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkJob() {
    const jobId = '30500499-cdd5-4ec0-a9d4-4b7b76de5027';
    console.log(`🔍 Checking Job ID: ${jobId}`);

    const job = await prisma.job.findUnique({
        where: { id: jobId },
        include: {
            // @ts-ignore
            commissions: true,
            company: true
        }
    });

    if (!job) {
        console.log('❌ Job not found!');
        return;
    }

    console.log(`✅ Job Found: ${job.title}`);
    console.log(`   - Payment Status: ${job.payment_status}`);
    console.log(`   - Company: ${job.company?.name || 'N/A'}`);
    console.log(`   - Sales Agent on Company: ${job.company?.sales_agent_id}`);

    // @ts-ignore
    if (job.commissions && job.commissions.length > 0) {
        // @ts-ignore
        console.log(`\n✅ Linked Commissions Found: ${job.commissions.length}`);
        // @ts-ignore
        job.commissions.forEach(c => {
            console.log(`   💰 Commission ID: ${c.id}`);
            console.log(`      - Consultant ID: ${c.consultant_id}`);
            console.log(`      - Amount: ${c.amount}`);
            console.log(`      - Status: ${c.status}`);
        });
    } else {
        console.log(`\n❌ No Commissions linked to this Job.`);

        // Is there a commission for this company created very recently?
        const recentCommissions = await prisma.commission.findMany({
            where: {
                company_id: job.company_id,
                created_at: {
                    gte: new Date(Date.now() - 1000 * 60 * 60) // Last hour
                }
            }
        });

        if (recentCommissions.length > 0) {
            console.log(`   ⚠️ Found ${recentCommissions.length} orphaned commissions for this company created in the last hour:`);
            recentCommissions.forEach(c => console.log(`      - ID: ${c.id}, Consultant: ${c.consultant_id}, Amount: ${c.amount}`));
        }
    }
}

checkJob()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
