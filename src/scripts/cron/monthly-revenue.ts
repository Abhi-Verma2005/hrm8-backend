/**
 * Monthly Revenue Calculation Cron Script
 * 
 * Runs on the 1st of each month to calculate the previous month's
 * revenue per region and create RegionalRevenue records.
 * 
 * Usage:
 *   npx tsx src/scripts/cron/monthly-revenue.ts
 *   npx tsx src/scripts/cron/monthly-revenue.ts 2024-12  # For specific month
 * 
 * Schedule: Run on 1st of each month at 3:00 AM
 */

import { RegionalRevenueService } from '../../services/billing/RegionalRevenueService';
import { SettlementService } from '../../services/billing/SettlementService';
import { subMonths, parse, isValid } from 'date-fns';

async function processMonthlyRevenue(targetMonth?: Date) {
    // Default to previous month
    const month = targetMonth || subMonths(new Date(), 1);

    console.log(`📊 Starting monthly revenue calculation for ${month.toISOString().slice(0, 7)}...`);

    try {
        // Step 1: Calculate revenue for all regions
        const revenueResult = await RegionalRevenueService.processAllRegionsForMonth(month);

        console.log(`\n📈 Revenue calculation: ${revenueResult.processed} regions processed`);
        if (revenueResult.errors.length > 0) {
            console.log('  ⚠️ Errors:', revenueResult.errors.join(', '));
        }

        // Step 2: Generate settlements for all licensees with pending revenue
        const settlementResult = await SettlementService.generateAllPendingSettlements(month);

        console.log(`\n💰 Settlements: ${settlementResult.generated} generated`);
        if (settlementResult.errors.length > 0) {
            console.log('  ⚠️ Errors:', settlementResult.errors.join(', '));
        }

        // Step 3: Print summary
        const stats = await SettlementService.getSettlementStats();
        console.log('\n📋 Settlement Summary:');
        console.log(`  Pending: ${stats.totalPending} ($${stats.pendingAmount.toFixed(2)})`);
        console.log(`  Paid: ${stats.totalPaid} ($${stats.paidAmount.toFixed(2)})`);

        console.log('\n✅ Monthly revenue processing complete!');

        return {
            success: true,
            regionsProcessed: revenueResult.processed,
            settlementsGenerated: settlementResult.generated,
            errors: [...revenueResult.errors, ...settlementResult.errors],
        };
    } catch (error) {
        console.error('❌ Monthly revenue processing failed:', error);
        return { success: false, error };
    }
}

// Run if executed directly
if (require.main === module) {
    // Parse optional month argument (format: YYYY-MM)
    let targetMonth: Date | undefined;
    const monthArg = process.argv[2];

    if (monthArg) {
        const parsed = parse(monthArg + '-01', 'yyyy-MM-dd', new Date());
        if (isValid(parsed)) {
            targetMonth = parsed;
            console.log(`Processing specific month: ${monthArg}`);
        } else {
            console.error(`Invalid month format: ${monthArg}. Use YYYY-MM format.`);
            process.exit(1);
        }
    }

    processMonthlyRevenue(targetMonth)
        .then((result) => {
            console.log('\nResult:', JSON.stringify(result, null, 2));
            process.exit(result.success ? 0 : 1);
        })
        .catch((error) => {
            console.error('Fatal error:', error);
            process.exit(1);
        });
}

export { processMonthlyRevenue };
