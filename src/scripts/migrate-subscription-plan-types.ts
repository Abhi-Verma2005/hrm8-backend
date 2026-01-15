/**
 * Migration Script: Update SubscriptionPlanType enum values
 * 
 * This script updates existing subscription records to use the new enum values:
 * - FREE -> ATS_LITE
 * - BASIC -> SMALL
 * - PROFESSIONAL -> MEDIUM
 * - ENTERPRISE -> ENTERPRISE (no change)
 * - CUSTOM -> CUSTOM (no change)
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mapping of old enum values to new ones
const PLAN_TYPE_MAPPING: Record<string, string> = {
    'FREE': 'ATS_LITE',
    'BASIC': 'SMALL',
    'PROFESSIONAL': 'MEDIUM',
    'ENTERPRISE': 'ENTERPRISE',
    'CUSTOM': 'CUSTOM',
};

async function migratePlanTypes() {
    console.log('🔄 Starting subscription plan type migration...\n');

    try {
        // Get all subscriptions
        const subscriptions = await prisma.$queryRaw<Array<{ id: string; planType: string }>>`
            SELECT id, "planType" FROM "Subscription"
        `;

        console.log(`📊 Found ${subscriptions.length} subscription(s) to check\n`);

        if (subscriptions.length === 0) {
            console.log('✅ No subscriptions found. Safe to proceed with schema migration.');
            return;
        }

        // Group subscriptions by plan type
        const planTypeCounts: Record<string, number> = {};
        subscriptions.forEach(sub => {
            planTypeCounts[sub.planType] = (planTypeCounts[sub.planType] || 0) + 1;
        });

        console.log('📈 Current plan type distribution:');
        Object.entries(planTypeCounts).forEach(([type, count]) => {
            console.log(`   ${type}: ${count}`);
        });
        console.log();

        // Check if any need updates
        const needsUpdate = subscriptions.filter(
            sub => ['FREE', 'BASIC', 'PROFESSIONAL'].includes(sub.planType)
        );

        if (needsUpdate.length === 0) {
            console.log('✅ All subscriptions already use the new enum values. Safe to proceed with schema migration.');
            return;
        }

        console.log(`⚠️  Found ${needsUpdate.length} subscription(s) that need updating:\n`);

        // Update each subscription
        let updated = 0;
        for (const subscription of needsUpdate) {
            const oldType = subscription.planType;
            const newType = PLAN_TYPE_MAPPING[oldType];

            if (!newType) {
                console.warn(`⚠️  Unknown plan type: ${oldType} for subscription ${subscription.id}`);
                continue;
            }

            // Use raw query to update since the enum doesn't match yet
            await prisma.$executeRaw`
                UPDATE "Subscription" 
                SET "planType" = ${newType}::text::"SubscriptionPlanType"
                WHERE id = ${subscription.id}
            `;

            console.log(`   ✓ Updated subscription ${subscription.id}: ${oldType} → ${newType}`);
            updated++;
        }

        console.log(`\n✅ Successfully updated ${updated} subscription(s)`);
        console.log('\n🎉 Migration complete! You can now safely run:');
        console.log('   npx prisma migrate dev --name update_subscription_plan_types\n');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Run the migration
migratePlanTypes()
    .then(() => {
        console.log('✨ Done!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('💥 Error:', error);
        process.exit(1);
    });
