
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';
// You might need to adjust this depending on how you get a valid token.
// For this test script, we'll assume we can login as a consultant first.
const CONSULTANT_EMAIL = 'abhi.sales@gmail.com'; // Replace with a valid consultant email
const CONSULTANT_PASSWORD = 'vAbhi2678'; // Replace with valid password

let token = '';
let opportunityId = '';

async function login() {
  try {
    console.log('Logging in...');
    const response = await axios.post(`${BASE_URL}/consultant/auth/login`, {
      email: CONSULTANT_EMAIL,
      password: CONSULTANT_PASSWORD
    });
    
    if (response.data.success) {
      token = response.data.data.token;
      console.log('Login successful. Token acquired.');
      // Important: Since we are making subsequent requests with axios directly (not using an instance),
      // we need to set the header on every request OR use a configured instance.
      // Setting defaults on the global object might be flaky if multiple modules use it or if it's reset.
      // Let's use a configured instance for subsequent calls.
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // Also, for cookie-based auth (if applicable), we might need to handle cookies.
      // But the middleware checks `req.cookies?.consultantSessionId`.
      // The login response likely sets a cookie.
      // In a script (node environment), axios doesn't automatically handle cookies like a browser.
      // We need to extract the cookie from the response headers and send it back.
      
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        console.log('Cookie found:', setCookieHeader);
        axios.defaults.headers.common['Cookie'] = setCookieHeader;
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

async function testCreateOpportunity() {
  try {
    console.log('\n--- Testing Create Opportunity ---');
    // We need a valid company ID. For testing, we might need to fetch one or create a dummy one if possible.
    // Assuming there's an endpoint to get companies or we hardcode one for now if known.
    // Let's try to fetch companies first to get an ID.
    const companiesResponse = await axios.get(`${BASE_URL}/sales/companies`);
    let companyId = '';
    
    if (companiesResponse.data.success && companiesResponse.data.data.companies.length > 0) {
      companyId = companiesResponse.data.data.companies[0].id;
      console.log(`Using existing company ID: ${companyId}`);
    } else {
       // If no company, we can't easily create an opportunity linked to one without creating a company first.
       // For this test, let's assume we need to create a lead and convert it, or just fail if no company.
       console.warn('No companies found to link opportunity. Skipping create test or create a lead first.');
       return;
    }

    const response = await axios.post(`${BASE_URL}/sales/opportunities`, {
      companyId: companyId,
      name: 'Test Opportunity 1',
      type: 'SUBSCRIPTION',
      stage: 'NEW',
      amount: 5000,
      description: 'A test opportunity created by script'
    });

    if (response.data.success) {
      opportunityId = response.data.data.opportunity.id;
      console.log('Opportunity created:', response.data.data.opportunity);
    } else {
      console.error('Create opportunity failed:', response.data);
    }
  } catch (error: any) {
    console.error('Create opportunity error:', error.response?.data || error.message);
  }
}

async function testGetOpportunities() {
  try {
    console.log('\n--- Testing Get Opportunities ---');
    const response = await axios.get(`${BASE_URL}/sales/opportunities`);
    if (response.data.success) {
      console.log(`Retrieved ${response.data.data.opportunities.length} opportunities`);
    } else {
      console.error('Get opportunities failed:', response.data);
    }
  } catch (error: any) {
    console.error('Get opportunities error:', error.response?.data || error.message);
  }
}

async function testUpdateOpportunity() {
  if (!opportunityId) return;
  try {
    console.log('\n--- Testing Update Opportunity ---');
    const response = await axios.put(`${BASE_URL}/sales/opportunities/${opportunityId}`, {
      stage: 'PROPOSAL',
      amount: 6000
    });

    if (response.data.success) {
      console.log('Opportunity updated:', response.data.data.opportunity);
      console.log('New Probability:', response.data.data.opportunity.probability); // Should be auto-updated
    } else {
      console.error('Update opportunity failed:', response.data);
    }
  } catch (error: any) {
    console.error('Update opportunity error:', error.response?.data || error.message);
  }
}

async function testGetPipelineStats() {
  try {
    console.log('\n--- Testing Pipeline Stats ---');
    const response = await axios.get(`${BASE_URL}/sales/opportunities/stats`);
    if (response.data.success) {
      console.log('Pipeline Stats:', response.data.data);
    } else {
      console.error('Get stats failed:', response.data);
    }
  } catch (error: any) {
    console.error('Get stats error:', error.response?.data || error.message);
  }
}

async function testCreateActivity() {
  try {
    console.log('\n--- Testing Create Activity ---');
    // We need a companyId again
    const companiesResponse = await axios.get(`${BASE_URL}/sales/companies`);
    if (!companiesResponse.data.success || companiesResponse.data.data.companies.length === 0) {
        console.warn('No company found for activity test.');
        return;
    }
    const companyId = companiesResponse.data.data.companies[0].id;

    const response = await axios.post(`${BASE_URL}/sales/activities`, {
      companyId: companyId,
      type: 'CALL',
      subject: 'Test Call',
      description: 'Logged via test script',
      opportunityId: opportunityId || undefined
    });

    if (response.data.success) {
      console.log('Activity created:', response.data.data.activity);
    } else {
      console.error('Create activity failed:', response.data);
    }
  } catch (error: any) {
    console.error('Create activity error:', error.response?.data || error.message);
  }
}

async function testGetActivities() {
  try {
    console.log('\n--- Testing Get Activities ---');
    const response = await axios.get(`${BASE_URL}/sales/activities`);
    if (response.data.success) {
      console.log(`Retrieved ${response.data.data.activities.length} activities`);
    } else {
      console.error('Get activities failed:', response.data);
    }
  } catch (error: any) {
    console.error('Get activities error:', error.response?.data || error.message);
  }
}

async function runTests() {
  await login();
  await testCreateOpportunity();
  await testUpdateOpportunity();
  await testGetOpportunities();
  await testGetPipelineStats();
  await testCreateActivity();
  await testGetActivities();
}

runTests();
