
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/hrm8';

// Credentials for a Regional Licensee / Admin
// NOTE: You need to replace this with a valid HRM8 Admin user
const ADMIN_EMAIL = 'rdx.omega2678@gmail.com'; 
const ADMIN_PASSWORD = 'vAbhi2678'; 

// We need a valid Region ID to test. 
// Ideally, fetch regions first and pick one.
let token = '';
let regionId = '';

async function login() {
  try {
    console.log('Logging in as Admin...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    });
    
    if (response.data.success) {
      token = response.data.data.token;
      console.log('Login successful.');
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

      // Capture cookies for session-based auth (if used)
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

async function getRegions() {
  try {
    console.log('\n--- Fetching Regions ---');
    const response = await axios.get(`${BASE_URL}/regions`);
    if (response.data.success && response.data.data.regions.length > 0) {
      regionId = response.data.data.regions[0].id;
      console.log(`Selected Region ID: ${regionId} (${response.data.data.regions[0].name})`);
    } else {
      console.warn('No regions found. Creating a test region...');
      // Optional: Create region if none exist
    }
  } catch (error: any) {
    console.error('Get regions error:', error.response?.data || error.message);
  }
}

async function testGetRegionalOpportunities() {
  if (!regionId) return;
  try {
    console.log('\n--- Testing Get Regional Opportunities ---');
    const response = await axios.get(`${BASE_URL}/sales/regional/opportunities`, {
      params: { regionId }
    });

    if (response.data.success) {
      const opps = response.data.data.opportunities;
      console.log(`Retrieved ${opps.length} opportunities for region.`);
      if (opps.length > 0) {
        console.log('Sample Opportunity:', {
          id: opps[0].id,
          name: opps[0].name,
          agent: opps[0].sales_agent
        });
      }
    } else {
      console.error('Failed:', response.data);
    }
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testGetRegionalStats() {
  if (!regionId) return;
  try {
    console.log('\n--- Testing Get Regional Pipeline Stats ---');
    const response = await axios.get(`${BASE_URL}/sales/regional/stats`, {
      params: { regionId }
    });

    if (response.data.success) {
      console.log('Pipeline Stats:', response.data.data);
    } else {
      console.error('Failed:', response.data);
    }
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function testGetRegionalActivities() {
  if (!regionId) return;
  try {
    console.log('\n--- Testing Get Regional Activities ---');
    const response = await axios.get(`${BASE_URL}/sales/regional/activities`, {
      params: { regionId }
    });

    if (response.data.success) {
      console.log(`Retrieved ${response.data.data.activities.length} activities.`);
    } else {
      console.error('Failed:', response.data);
    }
  } catch (error: any) {
    console.error('Error:', error.response?.data || error.message);
  }
}

async function runTests() {
  await login();
  await getRegions();
  
  if (regionId) {
    await testGetRegionalOpportunities();
    await testGetRegionalStats();
    await testGetRegionalActivities();
  } else {
    console.log('Skipping regional tests due to missing Region ID.');
  }
}

runTests();
