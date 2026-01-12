
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugCodecrafters() {
    console.log('Searching for company "Codecrafters"...');

    // Find Company
    const companies = await prisma.company.findMany({
        where: {
            name: { contains: 'Codecrafters', mode: 'insensitive' }
        },
        include: {
            opportunity: true, // Check for opportunities
            subscription: true, // Check for subscriptions
            // commissions: true // This relation might be on Opportunity or directly related, checking schema is safer but let's try
        }
    });

    if (companies.length === 0) {
        console.log('No company found matching "Codecrafters".');

        // Check Leads
        const leads = await prisma.lead.findMany({
            where: {
                company_name: { contains: 'Codecrafters', mode: 'insensitive' }
            }
        });

        if (leads.length > 0) {
            console.log('Found Leads:', JSON.stringify(leads, null, 2));
        } else {
            console.log('No leads found either.');
        }
        return;
    }

    for (const company of companies) {
        console.log('------------------------------------------------');
        console.log(`Company: ${company.name} (ID: ${company.id})`);
        console.log(`Status: ${company.verification_status}`);
        console.log(`Region ID: ${company.region_id}`);
        console.log(`Created At: ${company.created_at}`);

        console.log('\nSubscriptions:');
        if (company.subscription && company.subscription.length > 0) {
            console.log(JSON.stringify(company.subscription, null, 2));
        } else {
            console.log('No subscriptions found.');
        }

        console.log('\nOpportunities:');
        if (company.opportunity && company.opportunity.length > 0) {
            for (const opp of company.opportunity) {
                console.log(`- Opportunity: ${opp.name} (ID: ${opp.id})`);
                console.log(`  Stage: ${opp.stage}`);
                console.log(`  Amount: ${opp.amount}`);
                console.log(`  Sales Agent ID: ${opp.sales_agent_id}`);

                // Fetch commissions for this opportunity
                // Assuming opportunity_id exists based on naming convention
                /* const commissions = await prisma.commission.findMany({
                    where: { opportunity_id: opp.id }
                });

                console.log('  Commissions:');
                if (commissions.length > 0) {
                    console.log(JSON.stringify(commissions, null, 2));
                } else {
                    console.log('  No commissions found for this opportunity.');
                } */
            }
        } else {
            console.log('No opportunities found.');
        }

        // Also check for any commissions directly related to the company if applicable (though usually via Opportunity)
        // Or check if there are any commissions for the sales agent that might be related
    }
}

debugCodecrafters()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
