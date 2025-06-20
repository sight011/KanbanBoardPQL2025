const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3001';

async function testPasswordResetEndpoints() {
    console.log('🧪 Testing Password Reset Endpoints...\n');

    // Test 1: Forgot Password endpoint
    console.log('1. Testing /api/auth/forgot-password endpoint...');
    try {
        const response = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'test@example.com'
            })
        });

        const data = await response.json();
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
        
        if (response.status === 200) {
            console.log('   ✅ Forgot password endpoint is working!');
        } else {
            console.log('   ❌ Forgot password endpoint failed');
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('\n2. Testing /api/auth/verify-token endpoint...');
    try {
        const response = await fetch(`${BASE_URL}/api/auth/verify-token/test-token`, {
            method: 'GET'
        });

        const data = await response.json();
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
        
        if (response.status === 400) {
            console.log('   ✅ Token verification endpoint is working (correctly rejected invalid token)');
        } else {
            console.log('   ❌ Token verification endpoint failed');
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('\n3. Testing /api/auth/reset-password endpoint...');
    try {
        const response = await fetch(`${BASE_URL}/api/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token: 'invalid-token',
                newPassword: 'newpassword123'
            })
        });

        const data = await response.json();
        console.log(`   Status: ${response.status}`);
        console.log(`   Response: ${JSON.stringify(data, null, 2)}`);
        
        if (response.status === 400) {
            console.log('   ✅ Reset password endpoint is working (correctly rejected invalid token)');
        } else {
            console.log('   ❌ Reset password endpoint failed');
        }
    } catch (error) {
        console.log(`   ❌ Error: ${error.message}`);
    }

    console.log('\n🎉 Password Reset API Testing Complete!');
    console.log('\n📝 Next Steps:');
    console.log('1. Set up SendGrid API key in your .env file');
    console.log('2. Test with a real email address');
    console.log('3. Check your email for the reset link');
}

// Run the tests
testPasswordResetEndpoints().catch(console.error); 