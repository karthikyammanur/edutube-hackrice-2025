// Simple TwelveLabs API connectivity test
import dotenv from 'dotenv';

dotenv.config();

async function testConnectivity() {
  const apiKey = process.env.TWELVELABS_API_KEY;
  if (!apiKey) {
    console.log('❌ TWELVELABS_API_KEY not found');
    return;
  }

  console.log(`🔑 Testing API key: ${apiKey.substring(0, 10)}...`);
  
  // Test basic connectivity to different possible endpoints
  const endpoints = [
    'https://api.twelvelabs.io',
    'https://api.twelvelabs.co',
    'https://twelvelabs.io/api',
    'https://app.twelvelabs.io/api'
  ];

  for (const baseUrl of endpoints) {
    console.log(`\n🌐 Testing: ${baseUrl}`);
    
    try {
      const response = await fetch(baseUrl, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'User-Agent': 'EduTube-Notes/1.0'
        }
      });
      
      console.log(`   Status: ${response.status}`);
      
      if (response.ok) {
        const text = await response.text();
        console.log(`   ✅ Success! Response: ${text.substring(0, 100)}...`);
      } else {
        const text = await response.text();
        console.log(`   ⚠️  Error: ${text.substring(0, 100)}...`);
      }
    } catch (error) {
      console.log(`   ❌ Connection failed: ${error.message}`);
    }
  }
}

testConnectivity();