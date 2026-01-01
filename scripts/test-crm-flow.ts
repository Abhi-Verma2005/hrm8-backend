import prisma from '../src/lib/prisma';
import { ConsultantModel } from '../src/models/Consultant';
import { CompanyModel } from '../src/models/Company';
import { LeadService } from '../src/services/sales/LeadService';
import { AttributionService } from '../src/services/sales/AttributionService';
import { CommissionService } from '../src/services/hrm8/CommissionService';
import { ConsultantRole, ConsultantStatus, LeadStatus, RegionOwnerType, SubscriptionPlanType } from '@prisma/client';
import bcrypt from 'bcrypt';
import { addMonths } from 'date-fns';

async function testCrmFlow() {
  console.log('🚀 Starting CRM End-to-End Test Script...');

  try {
    // =================================================================
    // 1. Setup: Create Region and Sales Agent (Mocking Admin/Licensee)
    // =================================================================
    console.log('\n📦 Step 1: Setting up environment (Region & Sales Agent)...');

    // Create a Test Region if not exists
    let region = await prisma.region.findFirst({ where: { code: 'TEST-REGION' } });
    if (!region) {
      region = await prisma.region.create({
        data: {
          name: 'Test Region',
          code: 'TEST-REGION',
          country: 'Testland',
          owner_type: RegionOwnerType.HRM8,
        }
      });
      console.log('✅ Created Test Region:', region.name);
    } else {
      console.log('ℹ️  Using existing Test Region:', region.name);
    }

    // Create Sales Agent
    const agentEmail = `agent.${Date.now()}@hrm8.test`;
    const agentPassword = 'tempPassword123!';
    const agentPasswordHash = await bcrypt.hash(agentPassword, 10);

    const agent = await ConsultantModel.create({
      email: agentEmail,
      passwordHash: agentPasswordHash,
      firstName: 'James',
      lastName: 'Bond',
      role: ConsultantRole.SALES_AGENT,
      status: ConsultantStatus.ACTIVE,
      regionId: region.id,
      maxLeads: 50,
      currentLeads: 0,
    });
    console.log(`✅ Created Sales Agent: ${agent.firstName} ${agent.lastName} (${agent.email})`);

    // =================================================================
    // 2. Login & Password Change (Simulation)
    // =================================================================
    console.log('\n🔐 Step 2: Simulating Login & Password Change...');
    
    // Simulate checking credentials
    const isPasswordValid = await bcrypt.compare(agentPassword, agent.passwordHash);
    if (!isPasswordValid) throw new Error('Login failed: Invalid password');
    console.log('✅ Agent logged in successfully with temp password');

    // Change Password
    const newPassword = 'newSecurePassword456!';
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await ConsultantModel.updatePassword(agent.id, newPasswordHash);
    console.log('✅ Password updated successfully');

    // =================================================================
    // 3. Lead Capture
    // =================================================================
    console.log('\n📝 Step 3: Lead Capture...');
    
    const leadData = {
      companyName: `Acme Corp ${Date.now()}`,
      email: `admin@acme${Date.now()}.com`,
      country: 'United States',
      website: `https://acme${Date.now()}.com`,
      phone: '+15550199',
      referredBy: agent.id,
      createdBy: agent.id,
    };

    const lead = await LeadService.createLead(leadData);
    console.log(`✅ Lead Created: ${lead.company_name} (Status: ${lead.status})`);

    // Verify Agent can see the lead
    const myLeads = await LeadService.getLeadsByAgent(agent.id);
    const foundLead = myLeads.find(l => l.id === lead.id);
    if (!foundLead) throw new Error('Lead not found in agent\'s list');
    console.log('✅ Verified: Lead appears in Agent\'s dashboard');

    // =================================================================
    // 4. Lead Conversion (to Company)
    // =================================================================
    console.log('\n🔄 Step 4: Converting Lead to Company...');

    const companyData = {
      adminFirstName: 'Alice',
      adminLastName: 'Smith',
      password: 'adminPassword123!',
      acceptTerms: true,
    };

    const company = await LeadService.convertLeadToCompany(lead.id, companyData);
    console.log(`✅ Converted to Company: ${company.name} (ID: ${company.id})`);

    // Verify Lead Status Updated
    const updatedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
    if (updatedLead?.status !== LeadStatus.CONVERTED) throw new Error('Lead status not updated to CONVERTED');
    console.log('✅ Verified: Lead status is CONVERTED');

    // =================================================================
    // 5. Attribution Verification
    // =================================================================
    console.log('\n🔗 Step 5: Verifying Attribution...');

    const createdCompany = await CompanyModel.findById(company.id);
    if (createdCompany?.referredBy !== agent.id) throw new Error('Attribution mismatch: Company not referred by Agent');
    console.log('✅ Verified: Company is attributed to Agent');
    
    // Check Attribution Locking (Should NOT be locked yet - locking happens on payment usually, or manual)
    // But let's say we lock it manually for this test or verify logic
    if (createdCompany?.attributionLocked) console.log('ℹ️  Attribution is already locked (unexpected but checking)');
    else console.log('✅ Attribution is OPEN (as expected before payment/lock)');

    // =================================================================
    // 6. Subscription & Commission Test
    // =================================================================
    console.log('\n💰 Step 6: Simulating Subscription Purchase & Commission...');

    // Create Subscription
    const subscription = await prisma.subscription.create({
      data: {
        company_id: company.id,
        name: 'Professional Plan',
        plan_type: SubscriptionPlanType.PROFESSIONAL,
        status: 'ACTIVE',
        base_price: 1000,
        start_date: new Date(),
        sales_agent_id: agent.id, // Agent gets credit
      }
    });
    console.log('✅ Subscription Created:', subscription.name);

    // Create Bill (Paid)
    const bill = await prisma.bill.create({
      data: {
        company_id: company.id,
        subscription_id: subscription.id,
        bill_number: `INV-${Date.now()}`,
        amount: 1000,
        total_amount: 1000,
        status: 'PAID',
        due_date: new Date(),
        paid_at: new Date(),
      }
    });
    console.log('✅ Bill Created & Paid:', bill.bill_number);

    // Process Commission
    const commissionResult = await CommissionService.processSubscriptionPayment(bill.id);
    if (!commissionResult.success) throw new Error(`Commission processing failed: ${commissionResult.error}`);
    console.log('✅ Commission Processed successfully');

    // Verify Commission
    const commissions = await CommissionService.getConsultantCommissions(agent.id);
    const subCommission = commissions.find((c: any) => c.subscriptionId === subscription.id);
    
    if (!subCommission) throw new Error('Commission record not found');
    if (subCommission.amount !== 200) throw new Error(`Commission amount incorrect. Expected 200 (20% of 1000), got ${subCommission.amount}`);
    
    console.log(`✅ Verified: Commission of $${subCommission.amount} generated for Agent`);

    // =================================================================
    // 7. Lock Attribution (Post-Payment)
    // =================================================================
    console.log('\n🔒 Step 7: Locking Attribution...');
    
    await AttributionService.lockAttribution(company.id);
    const lockedCompany = await CompanyModel.findById(company.id);
    
    if (!lockedCompany?.attributionLocked) throw new Error('Failed to lock attribution');
    console.log(`✅ Attribution Locked until: ${lockedCompany.attributionLockedAt ? addMonths(lockedCompany.attributionLockedAt, 12).toISOString() : 'Unknown'}`);

    // =================================================================
    // 8. Duplicate Lead Check (Edge Case)
    // =================================================================
    console.log('\n🚫 Step 8: Testing Duplicate Lead Prevention...');
    try {
      await LeadService.createLead(leadData); // Attempt to create same lead again
      throw new Error('Duplicate lead creation should have failed but succeeded');
    } catch (e: any) {
      if (e.message.includes('already exists')) {
        console.log('✅ Verified: Duplicate lead creation prevented');
      } else {
        throw e; // Unexpected error
      }
    }

    // =================================================================
    // 9. Cleanup
    // =================================================================
    console.log('\n🧹 Step 9: Cleaning up test data...');
    
    // Delete Commission
    if (subCommission) {
      await prisma.commission.delete({ where: { id: subCommission.id } });
    }

    // Delete Bill
    await prisma.bill.delete({ where: { id: bill.id } });

    // Delete Subscription
    await prisma.subscription.delete({ where: { id: subscription.id } });

    // Update Lead to remove relation before deleting company (or just delete lead first)
    // Lead has converted_to_company_id which is FK to Company.
    // We can delete Lead first.
    await prisma.lead.delete({ where: { id: lead.id } });

    // Delete Company
    await prisma.company.delete({ where: { id: company.id } });

    // Delete Sales Agent
    await prisma.consultant.delete({ where: { id: agent.id } });

    console.log('✅ Cleanup complete');

    console.log('\n🎉 TEST COMPLETED SUCCESSFULLY! All systems go.');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testCrmFlow();
