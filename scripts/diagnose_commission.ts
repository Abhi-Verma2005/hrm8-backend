/**
 * Diagnostic script to check commission state for Newton School / alookikachori
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnose() {
    console.log('=== Commission Diagnostic Report ===\n');

    // 1. Find the consultant by email
    const consultant = await prisma.consultant.findFirst({
        where: { email: { contains: 'alookikachori', mode: 'insensitive' } },
        select: { id: true, email: true, first_name: true, last_name: true, region_id: true, role: true }
    });

    if (!consultant) {
        console.log('❌ Consultant not found with email containing "alookikachori"');
        return;
    }

    console.log('✅ Consultant Found:');
    console.log(`   ID: ${consultant.id}`);
    console.log(`   Email: ${consultant.email}`);
    console.log(`   Name: ${consultant.first_name} ${consultant.last_name}`);
    console.log(`   Role: ${consultant.role}`);
    console.log(`   Region ID: ${consultant.region_id}\n`);

    // 2. Find the company "Newton School"
    const company = await prisma.company.findFirst({
        where: { name: { contains: 'newton', mode: 'insensitive' } },
        select: {
            id: true,
            name: true,
            sales_agent_id: true,
            region_id: true,
            attribution_locked: true,
            attribution_locked_at: true
        }
    });

    if (!company) {
        console.log('❌ Company not found with name containing "newton"');
        return;
    }

    console.log('✅ Company Found:');
    console.log(`   ID: ${company.id}`);
    console.log(`   Name: ${company.name}`);
    console.log(`   Sales Agent ID: ${company.sales_agent_id || '⚠️ NOT SET (THIS IS THE PROBLEM)'}`);
    console.log(`   Region ID: ${company.region_id}`);
    console.log(`   Attribution Locked: ${company.attribution_locked}`);
    console.log(`   Attribution Locked At: ${company.attribution_locked_at}\n`);

    // 3. Find the lead that was converted to this company
    const lead = await prisma.lead.findFirst({
        where: { converted_to_company_id: company.id },
        select: {
            id: true,
            company_name: true,
            email: true,
            assigned_consultant_id: true,
            referred_by: true,
            created_by: true,
            region_id: true,
            status: true
        }
    });

    if (lead) {
        console.log('✅ Lead Found (converted to this company):');
        console.log(`   ID: ${lead.id}`);
        console.log(`   Company Name: ${lead.company_name}`);
        console.log(`   Assigned Consultant: ${lead.assigned_consultant_id}`);
        console.log(`   Referred By: ${lead.referred_by || '⚠️ NOT SET (CAUSED THE ISSUE)'}`);
        console.log(`   Created By: ${lead.created_by}`);
        console.log(`   Region ID: ${lead.region_id}`);
        console.log(`   Status: ${lead.status}\n`);
    } else {
        console.log('⚠️ No lead found that was converted to this company\n');
    }

    // 4. Find jobs for this company
    const jobs = await prisma.job.findMany({
        where: { company_id: company.id },
        select: {
            id: true,
            title: true,
            status: true,
            payment_status: true,
            service_package: true,
            payment_amount: true,
            payment_completed_at: true,
            region_id: true
        }
    });

    console.log(`✅ Jobs for this company: ${jobs.length}`);
    for (const job of jobs) {
        console.log(`   - "${job.title}"`);
        console.log(`     ID: ${job.id}`);
        console.log(`     Status: ${job.status}`);
        console.log(`     Payment Status: ${job.payment_status}`);
        console.log(`     Service Package: ${job.service_package}`);
        console.log(`     Payment Amount: $${job.payment_amount}`);
        console.log(`     Payment Completed At: ${job.payment_completed_at}`);
        console.log(`     Region ID: ${job.region_id}\n`);
    }

    // 5. Find commissions for this consultant
    const commissions = await prisma.commission.findMany({
        where: { consultant_id: consultant.id },
        select: {
            id: true,
            type: true,
            amount: true,
            status: true,
            description: true,
            job_id: true,
            created_at: true
        },
        orderBy: { created_at: 'desc' },
        take: 10
    });

    console.log(`✅ Recent Commissions for Consultant: ${commissions.length}`);
    for (const comm of commissions) {
        console.log(`   - ${comm.description}`);
        console.log(`     ID: ${comm.id}`);
        console.log(`     Type: ${comm.type}`);
        console.log(`     Amount: $${comm.amount}`);
        console.log(`     Status: ${comm.status}`);
        console.log(`     Job ID: ${comm.job_id || 'N/A'}`);
        console.log(`     Created: ${comm.created_at}\n`);
    }

    // 6. Check if any commission exists for the company's jobs
    const jobIds = jobs.map(j => j.id);
    const jobCommissions = await prisma.commission.findMany({
        where: { job_id: { in: jobIds } },
        select: {
            id: true,
            consultant_id: true,
            amount: true,
            description: true,
            status: true
        }
    });

    console.log(`✅ Commissions linked to this company's jobs: ${jobCommissions.length}`);
    for (const jc of jobCommissions) {
        console.log(`   - ${jc.description}`);
        console.log(`     Consultant ID: ${jc.consultant_id}`);
        console.log(`     Amount: $${jc.amount}`);
        console.log(`     Status: ${jc.status}\n`);
    }

    console.log('\n=== Diagnosis Summary ===');
    if (!company.sales_agent_id) {
        console.log('🔴 ROOT CAUSE: Company has NO sales_agent_id set.');
        console.log('   This happened because the lead was converted BEFORE the fix was applied.');
        console.log('   The CommissionService.processSalesCommission() returned early with error.');
        console.log('\n💡 FIX: Update the company to set sales_agent_id to the consultant ID.');
    } else if (company.sales_agent_id !== consultant.id) {
        console.log('🟡 ISSUE: Company has a DIFFERENT sales_agent_id than expected consultant.');
        console.log(`   Expected: ${consultant.id}`);
        console.log(`   Actual: ${company.sales_agent_id}`);
    } else {
        console.log('🟢 Company sales_agent_id is correctly set.');
        if (jobCommissions.length === 0) {
            console.log('🔴 BUT no commissions found for the jobs. Check if payment was processed.');
        }
    }

    await prisma.$disconnect();
}

diagnose().catch(console.error);
