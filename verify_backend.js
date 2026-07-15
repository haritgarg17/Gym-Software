const API_URL = 'http://localhost:5000/api';

async function testHealth() {
  try {
    const res = await fetch('http://localhost:5000/health');
    const json = await res.json();
    console.log('Health Check Response:', JSON.stringify(json, null, 2));
  } catch (error) {
    console.error('Health check failed. Is the server running?', error);
  }
}

async function testLogin() {
  try {
    const res = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'super@codebyt.com',
        password: 'admin123'
      })
    });
    const json = await res.json();
    console.log('Login Response:', JSON.stringify(json, null, 2));
  } catch (error) {
    console.error('Login request failed:', error);
  }
}

async function run() {
  console.log('Starting verification...');
  await testHealth();
  await testLogin();
  console.log('Verification finished.');
}

run();
