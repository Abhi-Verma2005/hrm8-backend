
import dotenv from 'dotenv';
dotenv.config();

import prisma from '../src/lib/prisma';
import { LeadService } from '../src/services/sales/LeadService';
import { LeadStatus } from '@prisma/client';

async function main() {
  console.log('--- Testing Lead Conversion Flow ---');

  const testEmail = `lead.test.${Date.now()}@gmail.com`;
  const testCompany = `Test Company ${Date.now()}`;
  const testDomain = `testcompany${Date.now()}.io`; // Custom domain

  try {
    // 1. Create a Lead
    console.log(`\n1. Creating Lead for ${testCompany} (${testEmail})...`);
    const lead = await LeadService.createLead({
      companyName: testCompany,
      email: testEmail,
      country: 'United States',
      website: 'https://www.google.com', // Mismatched website initially
      phone: '+15550000000',
    });
    console.log('✅ Lead created:', lead.id);

    // 2. Convert Lead to Company (with domain override and mismatch allowed)
    console.log('\n2. Converting Lead to Company...');
    const conversionData = {
      adminFirstName: 'John',
      adminLastName: 'Doe',
      password: 'password123',
      acceptTerms: true,
      email: `admin@${testDomain}`, // Changing email to match domain
      domain: testDomain, // Explicitly setting domain
    };

    console.log('Conversion Data:', conversionData);

    const company = await LeadService.convertLeadToCompany(lead.id, conversionData);
    console.log('✅ Company created:', company.id);
    console.log('   Name:', company.name);
    console.log('   Domain:', company.domain);
    console.log('   Verification Status:', company.verificationStatus);

    // 3. Verify Admin User Creation
    console.log('\n3. Verifying Admin User...');
    const user = await prisma.user.findFirst({
      where: { company_id: company.id }
    });

    if (user) {
      console.log('✅ Admin User found:', user.email);
      console.log('   Status:', user.status);
      console.log('   Role:', user.role);
    } else {
      console.error('❌ Admin User NOT found!');
      process.exit(1);
    }

    // 4. Verify Lead Status
    console.log('\n4. Verifying Lead Status...');
    const updatedLead = await prisma.lead.findUnique({ where: { id: lead.id } });
    console.log('   Status:', updatedLead?.status);
    console.log('   Converted To:', updatedLead?.converted_to_company_id);

    if (updatedLead?.status === LeadStatus.CONVERTED && updatedLead.converted_to_company_id === company.id) {
      console.log('✅ Lead status updated correctly.');
    } else {
      console.error('❌ Lead status incorrect.');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
