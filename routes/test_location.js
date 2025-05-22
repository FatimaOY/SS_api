const axios = require('axios');

// Get an auth token first
async function getAuthToken() {
  try {
    const response = await axios.post('http://localhost:3000/api/auth/login', {
      email: 'p@gmail.com',  // REPLACE with user 6 email
      password: 'password'               // REPLACE with user 6 password
    });
    return response.data.token;
  } catch (err) {
    console.error('Failed to get auth token:', err.message);
    process.exit(1);
  }
}

async function runLocationUpdates() {
  // Get device ID that belongs to user 6
  const USER_DEVICE_ID = 3;  // REPLACE with device ID owned by user 6
  
  // Get auth token
  const token = await getAuthToken();
  
  // Send location updates
  setInterval(async () => {
    try {
      // Slightly change coordinates each time
      const lat = 51.212776 + (Math.random() - 0.5) * 0.01;
      const lng = 4.4005974 + (Math.random() - 0.5) * 0.01;
      
      await axios.post(`http://localhost:3000/api/devices/${USER_DEVICE_ID}/locations`, {
        latitude: lat,
        longitude: lng,
        accuracy: 10
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log(`Sent location update for device ${USER_DEVICE_ID}: ${lat}, ${lng}`);
    } catch (err) {
      console.error('Error sending update:', err.message);
    }
  }, 5000);
}

runLocationUpdates();