const axios = require('axios');

// Test the profile API endpoints
async function testProfileAPI() {
  const baseURL = 'http://localhost:3000';
  
  try {
    console.log('Testing Profile API...');
    
    // Test 1: Check if server is running
    try {
      const healthCheck = await axios.get(`${baseURL}/health`);
      console.log('✅ Server is running:', healthCheck.data);
    } catch (err) {
      console.log('❌ Server is not running or health endpoint not available');
      return;
    }
    
    // Test 2: Test profile endpoint without auth (should fail)
    try {
      await axios.get(`${baseURL}/api/profile/1`);
      console.log('❌ Profile endpoint should require authentication');
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('✅ Profile endpoint correctly requires authentication');
      } else {
        console.log('❌ Unexpected error:', err.response?.status, err.response?.data);
      }
    }
    
    console.log('\nProfile API test completed. Make sure to:');
    console.log('1. Start the server with: node app.js');
    console.log('2. Ensure the database is running and accessible');
    console.log('3. Check that JWT_SECRET is set in your environment variables');
    
  } catch (err) {
    console.error('Test failed:', err.message);
  }
}

testProfileAPI(); 