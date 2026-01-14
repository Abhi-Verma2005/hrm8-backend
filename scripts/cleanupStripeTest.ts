/**
 * Cleanup Stripe Integration Test Data
 * Removes test integrations created during testing
 */

import prisma from '../src/lib/prisma';

async function main() {
    console.log('🧹 Cleaning up Stripe integration test data...\n');

    try {
        // Find all STRIPE_PAYMENTS integrations with pending status
        const testIntegrations = await prisma.integration.findMany({
            where: {
                type: 'STRIPE_PAYMENTS',
                stripe_account_status: 'pending',
            },
        });

        console.log(`Found ${testIntegrations.length} test integration(s)\n`);

        if (testIntegrations.length === 0) {
            console.log('✅ No test data to clean up');
            return;
        }

        // Display integrations to be deleted
        for (const integration of testIntegrations) {
            console.log(`   - ${integration.name} (${integration.id})`);
            console.log(`     Stripe Account: ${integration.stripe_account_id}`);
            console.log(`     Created: ${integration.created_at.toISOString()}`);
            console.log('');
        }

        // Delete the integrations
        const deleteResult = await prisma.integration.deleteMany({
            where: {
                type: 'STRIPE_PAYMENTS',
                stripe_account_status: 'pending',
            },
        });

        console.log(`✅ Deleted ${deleteResult.count} test integration(s)`);
        console.log('\n⚠️  Note: Stripe Connect accounts on Stripe\'s end remain.');
        console.log('   They can be deleted manually from the Stripe Dashboard if needed.');

    } catch (error: any) {
        console.error('❌ Cleanup failed:', error.message);
        process.exit(1);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
