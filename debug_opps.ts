
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const regionId = 'c8036bf9-7eba-47cf-9848-7fad90eb2a13';
    console.log('Checking Region:', regionId);

    // 1. Get Consultants in Region (Simulating Service Logic)
    // We'll fetch ALL consultants to see if maybe the role filter is excluding some who own the opps
    const consultants = await prisma.consultant.findMany({
        where: {
            region_id: regionId
        },
        select: { id: true, role: true, first_name: true }
    });

    console.log(`Found ${consultants.length} consultants in region:`);
    consultants.forEach(c => console.log(` - ${c.first_name} (${c.role}) ID: ${c.id}`));

    const consultantIds = consultants.map(c => c.id);

    // 2. Get Opportunities for these consultants
    const opps = await prisma.opportunity.findMany({
        where: {
            sales_agent_id: { in: consultantIds }
        }
    });

    console.log(`\nFound ${opps.length} opportunities for these consultants:`);
    let totalValue = 0;

    opps.forEach(o => {
        console.log(` - [${o.stage}] ${o.name}: Amount=${o.amount} (Type: ${typeof o.amount})`);
        if (typeof o.amount === 'number') {
            totalValue += o.amount;
        }
        // Check if it's active
        if (!['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage)) {
            console.log(`   -> ACTIVE DEAL`);
        }
    });

    console.log(`\nCalculated Total Value (Raw Sum): ${totalValue}`);

    // 3. Check "Active" specifically
    const activeOpps = opps.filter(o => !['CLOSED_WON', 'CLOSED_LOST'].includes(o.stage));
    const activeValue = activeOpps.reduce((sum, o) => sum + (o.amount || 0), 0);
    console.log(`Active Deals Count: ${activeOpps.length}`);
    console.log(`Active Pipeline Value: ${activeValue}`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
