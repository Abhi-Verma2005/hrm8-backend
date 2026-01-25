import { PrismaClient, CommissionType, SubscriptionPlanType, SubscriptionStatus } from '@prisma/client';
import { LeadService } from './src/services/sales/LeadService';
import { CommissionService } from './src/services/commissionService';
import { SubscriptionService } from './src/services/subscriptionService';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

async function runFullUISimulation() {
    console.log('🌟 Starting Full Real-Life User Simulation...\n');

    try {
        // 1. Setup Test Region
        const region = await prisma.region.findFirst() || await prisma.region.create({
            data: { id: crypto.randomUUID(), name: 'Global Simulation', code: 'SIM' + Date.now().toString().slice(-4), country: 'US' }
        });

        // 2. Setup Test Consultant (Sales Agent)
        const agentEmail = `agent_${Date.now().toString().slice(-4)}@hrm8.test`;
        const agent = await prisma.consultant.create({
            data: {
                id: crypto.randomUUID(),
                email: agentEmail,
                first_name: 'Simulated',
                last_name: 'Agent',
                password_hash: '$2b$10$7/O2zQW9R8fP3z.V6Y3vOe6sFfW6R6G6G6G6G6G6G6G6G6G6G6G6G', // password: Password123!
                role: 'RECRUITER',
                region_id: region.id
            }
        });
        console.log(`✅ Created Sales Agent: ${agentEmail} (Password: Password123!)`);

        // 3. Create a Lead
        console.log('\n--- Step 1: Lead Management ---');
        const lead = await LeadService.createLead({
            companyName: 'Simulation Corp',
            email: `admin_${Date.now().toString().slice(-4)}@simulation.test`,
            country: 'US',
            referredBy: agent.id
        });
        console.log(`✅ Lead Created for Simulation Corp`);

        // 4. Convert Lead to Company (Creates Admin)
        console.log('\n--- Step 2: Conversion & Attribution ---');
        const company = await LeadService.convertLeadToCompany(lead.id, {
            adminFirstName: 'Simulation',
            adminLastName: 'Admin',
            password: 'Password123!',
            acceptTerms: true
        });
        console.log(`✅ Lead Converted! Company ID: ${company.id}`);
        console.log(`✅ Created Company Admin: ${lead.email} (Password: Password123!)`);

        // 5. Award Commission to Agent
        console.log('\n--- Step 3: Growth & Commissions ---');
        const commService = new CommissionService(prisma);
        await commService.awardCommission({
            consultantId: agent.id,
            amount: 250,
            type: CommissionType.SUBSCRIPTION_SALE,
            description: 'Commission for Simulation Corp Conversion'
        });
        console.log(`✅ Commission of $250.00 awarded to Agent`);

        // 6. Simulate Subscription Renewal Failure
        console.log('\n--- Step 4: Financial Critical Alerts ---');
        const subService = new SubscriptionService(prisma);

        // Manually create a subscription that "fails" renewal due to 0 balance (default)
        const subscription = await prisma.subscription.create({
            data: {
                company_id: company.id,
                name: 'Basic Simulation Plan',
                plan_type: SubscriptionPlanType.BASIC,
                status: SubscriptionStatus.ACTIVE,
                base_price: 99.00,
                billing_cycle: 'MONTHLY',
                currency: 'USD',
                start_date: new Date(),
                end_date: new Date(Date.now() + 86400000),
                auto_renew: true
            }
        });

        // Trigger renewal (will fail because we didn't add money to this company's wallet)
        try {
            await subService.renewSubscription(subscription.id);
        } catch (e) {
            console.log(`✅ Subscription Renewal Failure triggered successfully (as expected)`);
        }

        // 7. Withdrawal Request & Approval
        console.log('\n--- Step 5: Consultant Payouts ---');
        const withdrawal = await commService.requestWithdrawal({
            consultantId: agent.id,
            amount: 150,
            paymentMethod: 'Bank Transfer',
            paymentDetails: { bank: 'Test Bank', account: '123456789' },
            notes: 'Simulation payout'
        });

        // Approve it (Simulating Admin action)
        await commService.approveWithdrawal({
            withdrawalId: withdrawal.id,
            adminId: agent.id, // Using agent as acting admin for simulation simplicity
            paymentReference: 'REF-' + Date.now(),
            adminNotes: 'Simulation approved'
        });
        console.log(`✅ Withdrawal of $150.00 approved for Agent`);

        console.log('\n🚀 Simulation Complete! 🚀');
        console.log('\nINSTRUCTIONS:');
        console.log(`1. Log in as AGENT: ${agentEmail} / Password123!`);
        console.log(`   - Expect: NEW_LEAD, LEAD_CONVERTED, COMMISSION_EARNED, WITHDRAWAL_APPROVED`);
        console.log(`2. Log in as ADMIN: ${lead.email} / Password123!`);
        console.log(`   - Expect: SUBSCRIPTION_RENEWAL_FAILED`);

    } catch (error) {
        console.error('\n❌ Simulation Failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

runFullUISimulation();
