// Simple test to verify API connection with environment variables
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

console.log('Testing API connection...');
console.log('API_BASE_URL:', API_BASE_URL);
console.log('API_KEY:', API_KEY ? 'Set' : 'Not set');

async function testAPI() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('✅ API connection successful!');
    console.log('Response:', data);
  } catch (error) {
    console.error('❌ API connection failed:', error.message);
  }
}

testAPI();
