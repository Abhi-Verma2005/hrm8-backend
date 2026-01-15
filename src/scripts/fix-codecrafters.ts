
import { PrismaClient } from '@prisma/client';
import { CommissionService } from '../services/hrm8/CommissionService';

const prisma = new PrismaClient();

async function fixCodecrafters() {
    console.log('🚀 Starting Codecrafters fix...');

    // 1. Find Codecrafters company
    const companies = await prisma.company.findMany({
        where: {
            name: { contains: 'Codecrafters', mode: 'insensitive' }
        }
    });

    if (companies.length === 0) {
        console.error('❌ Codecrafters company not found via script search.');
        return;
    }

    const company = companies[0];
    console.log(`✓ Found company: ${company.name} (${company.id})`);
    console.log(`Current Sales Agent ID: "${company.sales_agent_id}"`);

    // 1b. Check if sales agent is assigned (or valid)
    const needsAgent = !company.sales_agent_id || company.sales_agent_id === '';

    if (needsAgent || true) { // FORCE CHECK for debugging
        console.log('🔍 Checking associated opportunities for sales agent...');

        const opportunities = await prisma.opportunity.findMany({
            where: { company_id: company.id }
        });

        const oppWithAgent = opportunities.find(o => o.sales_agent_id);

        if (oppWithAgent && oppWithAgent.sales_agent_id) {
            console.log(`✓ Found sales agent on opportunity: ${oppWithAgent.sales_agent_id}`);

            if (company.sales_agent_id !== oppWithAgent.sales_agent_id) {
                // Assign agent to company
                const { AttributionService } = await import('../services/sales/AttributionService');
                await AttributionService.assignAgentToCompany(company.id, oppWithAgent.sales_agent_id);
                console.log(`✓ Assigned/Updated agent on company.`);

                // Refresh company record
                const refreshedCompany = await prisma.company.findUnique({ where: { id: company.id } });
                if (refreshedCompany) Object.assign(company, refreshedCompany);
            } else {
                console.log('✓ Company already has correct agent.');
            }
        } else {
            console.log('⚠️ No sales agent found on opportunities either.');
        }
    }

    // 2. Identify the upgrade details
    // Based on user report, they paid. Assuming 'Shortlisting' or 'Full Service'.
    // We can check subscription tier in DB if updated?
    // Let's check profile or subscription relation.

    // Note: debug script showed NO subscription method, which means maybe StripeUpgradeService failed earlier or didn't create relation?
    // Actually StripeUpgradeService updates `profile_data` JSON, it doesn't create a `Subscription` model record (that seems to be a separate model not fully used by upgrade service?).
    // Wait, `UPGRADE_PRICE_MAP` suggests it's a "Shortlisting" etc package.

    // Let's assume it was a 'Shortlisting' package ($1990) for now, or check if we can see it in profile profile_data.
    const profile = await prisma.companyProfile.findUnique({
        where: { company_id: company.id }
    });

    let amount = 1990.00; // Default fallback
    let description = "Sales commission for Shortlisting subscription (Backfill)";

    if (profile && profile.profile_data) {
        const data = profile.profile_data as any;
        if (data.billing && data.billing.lastPaymentAmount) {
            amount = data.billing.lastPaymentAmount / 100; // Usually stored in cents in upgrade service? 
            // UPGRADE_PRICE_MAP has amount in DOLLARS (1990), not cents?
            // Let's check StripeUpgradeService:
            // shortlisting: { amount: 1990, ... }
            // unit_amount: amount * 100 (so 199000 cents)
            // lastPaymentAmount: amount (so 1990)

            // So if stored in DB as 1990, it's dollars.
            amount = data.billing.lastPaymentAmount;
            console.log(`✓ Found payment amount in profile: $${amount}`);
        }
    }

    // 3. Trigger Commission Processing
    console.log(`\nProcessing commission for amount: $${amount}...`);

    const result = await CommissionService.processSalesCommission(
        company.id,
        amount,
        description,
        undefined,
        undefined, // No subscription ID available maybe?
        'SUBSCRIPTION_SALE'
    );

    if (result.success) {
        console.log(`✅ Success! Commission ID: ${result.commissionId}`);
    } else {
        console.error(`❌ Failed: ${result.error}`);
    }

    console.log('\nDone.');
}

fixCodecrafters()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
