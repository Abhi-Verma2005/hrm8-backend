/**
 * Renewal Check Cron Script
 * 
 * Checks for subscriptions expiring within 90 days and automatically
 * creates renewal opportunities for sales agents to follow up.
 * 
 * Usage:
 *   npx tsx src/scripts/cron/renewal-check.ts
 * 
 * Schedule: Run daily at 3:00 AM
 */

import prisma from '../../lib/prisma';
import { OpportunityType, OpportunityStage } from '@prisma/client';
import { addDays, differenceInDays } from 'date-fns';

interface RenewalCheckResult {
    success: boolean;
    created: number;
    skipped: number;
    errors: string[];
}

async function processRenewalOpportunities(): Promise<RenewalCheckResult> {
    console.log('🔄 Starting renewal opportunity check...');

    const result: RenewalCheckResult = {
        success: true,
        created: 0,
        skipped: 0,
        errors: [],
    };

    const now = new Date();
    const ninetyDaysFromNow = addDays(now, 90);

    try {
        // Find active subscriptions expiring within 90 days
        const expiringSubscriptions = await prisma.subscription.findMany({
            where: {
                status: 'ACTIVE',
                end_date: {
                    gte: now,
                    lte: ninetyDaysFromNow,
                },
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                        sales_owner_id: true,
                    },
                },
            },
        });

        console.log(`  📋 Found ${expiringSubscriptions.length} subscriptions expiring within 90 days`);

        for (const subscription of expiringSubscriptions) {
            try {
                const companyId = subscription.company_id;
                const companyName = subscription.company?.name || 'Unknown Company';
                const salesOwnerId = subscription.company?.sales_owner_id;

                if (!salesOwnerId) {
                    console.log(`  ⚠️  Skipping ${companyName}: No sales owner assigned`);
                    result.skipped++;
                    continue;
                }

                // Check if renewal opportunity already exists for this subscription
                const existingOpportunity = await prisma.opportunity.findFirst({
                    where: {
                        company_id: companyId,
                        type: 'RENEWAL' as OpportunityType,
                        stage: {
                            notIn: ['CLOSED_WON', 'CLOSED_LOST'],
                        },
                        // Check for opportunities created for this renewal period
                        expected_close_date: {
                            gte: addDays(subscription.end_date!, -30),
                            lte: addDays(subscription.end_date!, 30),
                        },
                    },
                });

                if (existingOpportunity) {
                    console.log(`  ⏭️  Skipping ${companyName}: Renewal opportunity already exists`);
                    result.skipped++;
                    continue;
                }

                // Calculate days until expiry
                const daysUntilExpiry = differenceInDays(subscription.end_date!, now);

                // Create renewal opportunity
                const opportunity = await prisma.opportunity.create({
                    data: {
                        company_id: companyId,
                        name: `Renewal: ${companyName} - ${subscription.plan_name || 'Subscription'}`,
                        type: 'RENEWAL' as OpportunityType,
                        stage: 'NEW' as OpportunityStage,
                        amount: subscription.amount || 0,
                        currency: subscription.currency || 'USD',
                        probability: 70, // Higher probability for renewals
                        expected_close_date: subscription.end_date,
                        sales_agent_id: salesOwnerId,
                        description: `Auto-created renewal opportunity. Subscription expires in ${daysUntilExpiry} days.`,
                        tags: ['auto-renewal', 'subscription'],
                    },
                });

                console.log(`  ✅ Created renewal opportunity for ${companyName} (expires in ${daysUntilExpiry} days)`);
                result.created++;

                // Optionally create a notification for the sales agent
                // await NotificationService.create({
                //   userId: salesOwnerId,
                //   type: 'RENEWAL_OPPORTUNITY',
                //   title: `Renewal opportunity created for ${companyName}`,
                //   message: `Subscription expires in ${daysUntilExpiry} days`,
                // });

            } catch (error: any) {
                const errorMsg = `Failed to process subscription ${subscription.id}: ${error.message}`;
                console.error(`  ❌ ${errorMsg}`);
                result.errors.push(errorMsg);
            }
        }

        console.log(`\n✅ Renewal check complete.`);
        console.log(`   Created: ${result.created}`);
        console.log(`   Skipped: ${result.skipped}`);
        if (result.errors.length > 0) {
            console.log(`   Errors: ${result.errors.length}`);
            result.success = result.errors.length === 0;
        }

        return result;
    } catch (error: any) {
        console.error('❌ Renewal check failed:', error);
        return {
            success: false,
            created: 0,
            skipped: 0,
            errors: [error.message],
        };
    }
}

// Run if executed directly
if (require.main === module) {
    processRenewalOpportunities()
        .then((result) => {
            console.log('\nResult:', JSON.stringify(result, null, 2));
            process.exit(result.success ? 0 : 1);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { processRenewalOpportunities };
