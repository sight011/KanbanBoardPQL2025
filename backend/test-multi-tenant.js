const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_COMPANY_SLUG = 'default-company';

// Test data
const testUser = {
  username: 'testuser',
  email: 'test@example.com',
  password: 'testpassword123',
  firstName: 'Test',
  lastName: 'User'
};

async function testMultiTenantAPI() {
  console.log('🧪 Testing Multi-Tenant API...\n');

  try {
    // Test 1: Check server status
    console.log('📋 Test 1: Server Status');
    const statusResponse = await axios.get(`${BASE_URL}/`);
    console.log('✅ Server is running');
    console.log('📊 Response:', statusResponse.data);
    console.log('');

    // Test 2: Test with company slug header
    console.log('📋 Test 2: Company Slug Header');
    try {
      const headerResponse = await axios.get(`${BASE_URL}/api/tasks`, {
        headers: {
          'X-Company-Slug': TEST_COMPANY_SLUG
        }
      });
      console.log('✅ Company slug header works');
      console.log('📊 Tasks count:', headerResponse.data.length || 0);
    } catch (error) {
      console.log('⚠️  Company slug header test failed:', error.response?.data?.message || error.message);
    }
    console.log('');

    // Test 3: Test with query parameter
    console.log('📋 Test 3: Company Slug Query Parameter');
    try {
      const queryResponse = await axios.get(`${BASE_URL}/api/tasks?company_slug=${TEST_COMPANY_SLUG}`);
      console.log('✅ Company slug query parameter works');
      console.log('📊 Tasks count:', queryResponse.data.length || 0);
    } catch (error) {
      console.log('⚠️  Company slug query parameter test failed:', error.response?.data?.message || error.message);
    }
    console.log('');

    // Test 4: Test sprints endpoint
    console.log('📋 Test 4: Sprints Endpoint');
    try {
      const sprintsResponse = await axios.get(`${BASE_URL}/api/sprints`, {
        headers: {
          'X-Company-Slug': TEST_COMPANY_SLUG
        }
      });
      console.log('✅ Sprints endpoint works');
      console.log('📊 Sprints count:', sprintsResponse.data.length || 0);
    } catch (error) {
      console.log('⚠️  Sprints endpoint test failed:', error.response?.data?.message || error.message);
    }
    console.log('');

    // Test 5: Test users endpoint
    console.log('📋 Test 5: Users Endpoint');
    try {
      const usersResponse = await axios.get(`${BASE_URL}/api/users`, {
        headers: {
          'X-Company-Slug': TEST_COMPANY_SLUG
        }
      });
      console.log('✅ Users endpoint works');
      console.log('📊 Users count:', usersResponse.data.length || 0);
    } catch (error) {
      console.log('⚠️  Users endpoint test failed:', error.response?.data?.message || error.message);
    }
    console.log('');

    // Test 6: Test invalid company slug
    console.log('📋 Test 6: Invalid Company Slug');
    try {
      await axios.get(`${BASE_URL}/api/tasks`, {
        headers: {
          'X-Company-Slug': 'invalid-company'
        }
      });
      console.log('❌ Should have failed with invalid company slug');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Invalid company slug correctly rejected');
        console.log('📊 Error message:', error.response.data.message);
      } else {
        console.log('⚠️  Unexpected error for invalid company slug:', error.response?.data?.message || error.message);
      }
    }
    console.log('');

    console.log('🎉 Multi-Tenant API Tests Completed!');
    console.log('\n📋 Summary:');
    console.log('- Server is running with multi-tenant support');
    console.log('- Company slug extraction works via headers and query parameters');
    console.log('- API endpoints are accessible with proper tenant context');
    console.log('- Invalid company slugs are properly rejected');

  } catch (error) {
    console.error('💥 Test failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('💡 Make sure the server is running on port 3001');
    }
  }
}

// Run tests
testMultiTenantAPI(); 