const axios = require('axios');

// Test configuration
const BASE_URL = 'http://localhost:3001';
const TEST_USERS = [
    { email: 'jd@gmail.com', password: 'passwordfortheuser22!!', name: 'Adrian Lauber' },
    { email: 'exampleXXDDD@gmx.de', password: 'Phono6677!!', name: 'Hans Peter' }
];

let userSessions = [];

// Helper function to login and get session
async function loginUser(user) {
    try {
        const response = await axios.post(`${BASE_URL}/api/login`, {
            email: user.email,
            password: user.password
        }, {
            withCredentials: true
        });
        
        if (response.data && response.data.id) {
            console.log(`✅ Login successful for ${user.name}`);
            return response.headers['set-cookie'];
        }
    } catch (error) {
        console.log(`❌ Login failed for ${user.name}:`, error.response?.data?.error || error.message);
    }
    return null;
}

// Helper function to make authenticated requests
async function makeAuthenticatedRequest(url, method = 'GET', data = null, cookies = null) {
    try {
        const config = {
            method,
            url: `${BASE_URL}${url}`,
            withCredentials: true
        };
        
        if (cookies) {
            config.headers = { Cookie: cookies.join('; ') };
        }
        
        if (data) {
            config.data = data;
        }
        
        const response = await axios(config);
        return { success: true, data: response.data, status: response.status };
    } catch (error) {
        return { 
            success: false, 
            error: error.response?.data?.error || error.message,
            status: error.response?.status 
        };
    }
}

// Test parameter tampering prevention
async function testParameterTampering() {
    console.log('\n🔒 Testing Parameter Tampering Prevention...');
    
    const firstUserCookies = userSessions[0];
    if (!firstUserCookies) {
        console.log('⚠️  Skipping parameter tampering test - no session');
        return;
    }
    
    // Try to create a task with a fake company_id
    const maliciousTask = {
        title: 'Malicious Task Test',
        description: 'This should be blocked by security middleware',
        status: 'todo',
        priority: 'medium',
        company_id: 999999, // Fake company ID
        project_id: 1
    };
    
    console.log('🚫 Attempting to create task with fake company_id...');
    const response = await makeAuthenticatedRequest('/api/tasks', 'POST', maliciousTask, firstUserCookies);
    
    if (response.success) {
        console.log('❌ SECURITY VIOLATION: Task created with fake company_id!');
        console.log('   Response:', response.data);
    } else {
        console.log('✅ Parameter tampering properly prevented');
        console.log('   Error:', response.error);
    }
}

// Test cross-company access blocking
async function testCrossCompanyAccess() {
    console.log('\n🔒 Testing Cross-Company Access Blocking...');
    
    // Get task IDs from first user
    const firstUserCookies = userSessions[0];
    if (!firstUserCookies) {
        console.log('⚠️  Skipping cross-company test - no first user session');
        return;
    }
    
    const tasksResponse = await makeAuthenticatedRequest('/api/tasks', 'GET', null, firstUserCookies);
    if (!tasksResponse.success || !tasksResponse.data.tasks || tasksResponse.data.tasks.length === 0) {
        console.log('⚠️  Skipping cross-company test - no tasks available');
        return;
    }
    
    const firstTaskId = tasksResponse.data.tasks[0].id;
    console.log(`📝 Testing access to task ${firstTaskId} from different company...`);
    
    // Try to access this task from second user (different company)
    const secondUserCookies = userSessions[1];
    if (secondUserCookies) {
        const crossCompanyResponse = await makeAuthenticatedRequest(`/api/tasks/${firstTaskId}`, 'GET', null, secondUserCookies);
        
        if (crossCompanyResponse.success) {
            console.log('❌ SECURITY VIOLATION: Cross-company access allowed!');
        } else if (crossCompanyResponse.status === 404) {
            console.log('✅ Cross-company access properly blocked (404)');
        } else {
            console.log(`✅ Cross-company access blocked with status: ${crossCompanyResponse.status}`);
        }
    }
}

// Main test runner
async function runQuickSecurityTest() {
    console.log('🔒 Starting Quick Security Test...\n');
    
    // Step 1: Login all test users
    console.log('🔐 Logging in test users...');
    for (const user of TEST_USERS) {
        const cookies = await loginUser(user);
        userSessions.push(cookies);
    }
    
    // Step 2: Run critical security tests
    await testParameterTampering();
    await testCrossCompanyAccess();
    
    console.log('\n✅ Quick security test completed!');
    
    if (userSessions[0] && userSessions[1]) {
        console.log('\n📋 Summary:');
        console.log('  - Login: ✅ Both users logged in successfully');
        console.log('  - Parameter tampering prevention: ✅ Tested');
        console.log('  - Cross-company blocking: ✅ Tested');
    } else {
        console.log('\n⚠️  Some users failed to login - check credentials');
    }
    
    process.exit(0);
}

// Run the tests
runQuickSecurityTest().catch(error => {
    console.error('❌ Security test runner failed:', error);
    process.exit(1);
}); 