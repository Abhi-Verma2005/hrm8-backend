
import axios from 'axios';
import prisma from '../src/lib/prisma';
import { hashPassword } from '../src/utils/password';
import { HRM8UserRole, HRM8UserStatus, ConsultantRole } from '../src/types';

const BASE_URL = 'http://localhost:3000/api/hrm8';

// Credentials for a Regional Licensee / Admin
const ADMIN_EMAIL = 'test_licensee@hrm8.com'; 
const ADMIN_PASSWORD = 'Password123'; 

let regionId = '';
let leadId = '';
let consultantId = '';

async function setupTestData() {
  console.log('Setting up test data...');
  
  // 1. Create or Update Test Licensee User
  const hashedPassword = await hashPassword(ADMIN_PASSWORD);
  const user = await prisma.hRM8User.upsert({
    where: { email: ADMIN_EMAIL },
    update: { 
      password_hash: hashedPassword,
      status: HRM8UserStatus.ACTIVE,
      role: HRM8UserRole.REGIONAL_LICENSEE 
    },
    create: {
      email: ADMIN_EMAIL,
      password_hash: hashedPassword,
      first_name: 'Test',
      last_name: 'Licensee',
      role: HRM8UserRole.REGIONAL_LICENSEE,
      status: HRM8UserStatus.ACTIVE
    }
  });
  console.log(`User ${ADMIN_EMAIL} is ready.`);

  // 2. Create or Update Test Regional Licensee
  const testLicenseeId = 'test-licensee-123';
  const licensee = await prisma.regionalLicensee.upsert({
    where: { id: testLicenseeId },
    update: {
      name: 'Test Licensee Org',
      legal_entity_name: 'Test Licensee Org LLC',
      email: 'org@test.com',
      agreement_start_date: new Date(),
      revenue_share_percent: 20,
      manager_contact: 'Test Manager'
    },
    create: {
      id: testLicenseeId,
      name: 'Test Licensee Org',
      legal_entity_name: 'Test Licensee Org LLC',
      email: 'org@test.com',
      agreement_start_date: new Date(),
      revenue_share_percent: 20,
      manager_contact: 'Test Manager'
    }
  });
  console.log(`Licensee ${licensee.name} is ready.`);
  
  // Assign licensee to user
  await prisma.hRM8User.update({
    where: { id: user.id },
    data: { licensee_id: testLicenseeId }
  });

  // 3. Create a Region
  // Based on schema, Region has licensee_id (String?)
  const region = await prisma.region.create({
    data: {
      name: 'Test Region ' + Date.now(),
      code: 'TR' + Date.now(),
      country: 'USA',
      owner_type: 'LICENSEE',
      licensee_id: testLicenseeId
    }
  });
  regionId = region.id;
  console.log(`Region ${region.name} created.`);

  // 4. Create a Consultant in this Region
  const consultant = await prisma.consultant.create({
    data: {
      first_name: 'Test',
      last_name: 'Agent',
      email: 'agent' + Date.now() + '@test.com',
      password_hash: hashedPassword,
      region_id: regionId,
      status: 'ACTIVE',
      role: ConsultantRole.SALES_AGENT // Corrected role
    }
  });
  consultantId = consultant.id;
  console.log(`Consultant ${consultant.email} created.`);

  // 5. Create a Lead in this Region
  const lead = await prisma.lead.create({
    data: {
      company_name: 'Test Corp ' + Date.now(),
      email: 'lead' + Date.now() + '@test.com',
      country: 'USA',
      status: 'NEW',
      region_id: regionId,
      created_by: consultantId, 
      assigned_consultant_id: consultantId 
    }
  });
  leadId = lead.id;
  console.log(`Lead ${lead.company_name} created.`);
}

async function login() {
  try {
    console.log('Logging in as Admin...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (response.data.success) {
      console.log('Login successful.');
      //axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.data.token}`;

      // Capture cookies for session-based auth
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        // Extract session ID from cookie
        const hrm8SessionId = setCookieHeader.find(c => c.includes('hrm8SessionId'));
        if (hrm8SessionId) {
          const cookieValue = hrm8SessionId.split(';')[0];
          axios.defaults.headers.common['Cookie'] = cookieValue;
          console.log('Session Cookie set:', cookieValue);
        }
      }
    } else {
      console.error('Login failed:', response.data);
      process.exit(1);
    }
  } catch (error: any) {
    console.error('Login error:', error.response?.data || error.message);
    process.exit(1);
  }
}

async function testGetRegionalLeads() {
  if (!regionId) return;
  try {
    console.log('\n--- Testing Get Regional Leads ---');
    const response = await axios.get(`${BASE_URL}/leads/regional`, {
      params: { regionId }
    });

    if (response.data.success) {
      const leads = response.data.data.leads;
      console.log(`Retrieved ${leads.length} leads for region.`);
      if (leads.length > 0) {
        leadId = leads[0].id;
        console.log('Sample Lead Data:', {
          id: leads[0].id,
          company: leads[0].company_name,
          creator: leads[0].creator ? `${leads[0].creator.first_name} ${leads[0].creator.last_name}` : 'System',
          assigned_to: leads[0].consultant ? `${leads[0].consultant.first_name} ${leads[0].consultant.last_name}` : 'Unassigned'
        });
      }
    } else {
      console.error('Failed to fetch leads:', response.data);
    }
  } catch (error: any) {
    console.error('Get regional leads error:', error.response?.data || error.message);
  }
}

async function testReassignLead() {
  if (!leadId || !consultantId) {
    console.log('\n--- Skipping Reassignment Test (Missing lead or consultant) ---');
    return;
  }
  
  try {
    console.log('\n--- Testing Lead Reassignment ---');
    const response = await axios.post(`${BASE_URL}/leads/${leadId}/reassign`, {
      consultantId: consultantId
    });

    if (response.data.success) {
      console.log('Lead reassigned successfully.');
      console.log('Updated Lead Info:', {
        id: response.data.data.lead.id,
        new_consultant: `${response.data.data.lead.consultant.first_name} ${response.data.data.lead.consultant.last_name}`
      });
    } else {
      console.error('Reassignment failed:', response.data);
    }
  } catch (error: any) {
    console.error('Reassign lead error:', error.response?.data || error.message);
  }
}

async function runTests() {
  await setupTestData();
  await login();
  
  if (regionId) {
    await testGetRegionalLeads();
    await testReassignLead();
  } else {
    console.log('Skipping tests due to missing data.');
  }
}

runTests();
