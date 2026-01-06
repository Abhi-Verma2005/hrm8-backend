/**
 * Commission Expiry Cron Script
 * 
 * Marks PENDING commissions as EXPIRED when they exceed 12 months
 * from the subscription start date.
 * 
 * Usage:
 *   npx tsx src/scripts/cron/commission-expiry.ts
 * 
 * Schedule: Run daily at 2:00 AM
 */

import prisma from '../../lib/prisma';
import { CommissionStatus, CommissionType } from '@prisma/client';
import { subMonths } from 'date-fns';

async function processCommissionExpiry() {
    console.log('🕐 Starting commission expiry check...');

    const twelveMonthsAgo = subMonths(new Date(), 12);

    try {
        // Find PENDING subscription commissions older than 12 months
        const expiredCommissions = await prisma.commission.findMany({
            where: {
                status: CommissionStatus.PENDING,
                type: CommissionType.SUBSCRIPTION_SALE,
                created_at: { lt: twelveMonthsAgo },
            },
            include: {
                subscription: {
                    select: { start_date: true },
                },
            },
        });

        let expiredCount = 0;

        for (const commission of expiredCommissions) {
            // Check if subscription start date is more than 12 months ago
            const subStartDate = commission.subscription?.start_date;
            if (subStartDate && subStartDate < twelveMonthsAgo) {
                await prisma.commission.update({
                    where: { id: commission.id },
                    data: {
                        status: CommissionStatus.CANCELLED,
                        notes: `Auto-expired: Commission period exceeded 12 months from subscription start (${subStartDate.toISOString()})`,
                    },
                });
                expiredCount++;
                console.log(`  ❌ Expired commission ${commission.id} (subscription started ${subStartDate.toISOString()})`);
            }
        }

        // Also check commissions with explicit expiry dates
        const commissionsWithExpiry = await prisma.commission.updateMany({
            where: {
                status: CommissionStatus.PENDING,
                commission_expiry_date: { lt: new Date() },
            },
            data: {
                status: CommissionStatus.CANCELLED,
                notes: 'Auto-expired: Commission expiry date passed',
            },
        });

        const totalExpired = expiredCount + commissionsWithExpiry.count;
        console.log(`✅ Commission expiry check complete. Expired: ${totalExpired}`);

        return { success: true, expired: totalExpired };
    } catch (error) {
        console.error('❌ Commission expiry check failed:', error);
        return { success: false, error };
    }
}

// Run if executed directly
if (require.main === module) {
    processCommissionExpiry()
        .then((result) => {
            console.log('Result:', result);
            process.exit(result.success ? 0 : 1);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { processCommissionExpiry };
