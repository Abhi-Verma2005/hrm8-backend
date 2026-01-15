import prisma from '../lib/prisma';

async function updateIntegrations() {
    const result = await prisma.integration.updateMany({
        where: {
            type: 'STRIPE_PAYMENTS',
            stripe_account_status: 'pending',
        },
        data: {
            stripe_account_status: 'active',
        },
    });

    console.log(`✅ Updated ${result.count} integr ation(s) to active status`);
}

updateIntegrations()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Error:', error);
        process.exit(1);
    });
