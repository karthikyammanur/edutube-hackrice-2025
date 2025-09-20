// Quick test of working endpoints
console.log('🚀 Testing API Endpoints - Server Running!\n');

const API_BASE = 'http://127.0.0.1:3000';

async function quickTest() {
  console.log('🏥 1. Health Check:');
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📊 Response:`, data);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }
  
  console.log('\n🔍 2. Search Endpoint:');
  try {
    const response = await fetch(`${API_BASE}/search?query=test`);
    const data = await response.json();
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📊 Response:`, data);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }
  
  console.log('\n📹 3. Video Status:');
  try {
    const response = await fetch(`${API_BASE}/videos/test-123`);
    const data = await response.json();
    console.log(`   ✅ Status: ${response.status}`);
    console.log(`   📊 Response:`, data);
  } catch (error) {
    console.log(`   ❌ Failed: ${error.message}`);
  }
}

quickTest();