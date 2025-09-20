// Simple test to verify the API server is working
const API_BASE = 'http://localhost:3000';

console.log('🔍 Testing API Health Endpoint...');

try {
  const response = await fetch(`${API_BASE}/health`);
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const data = await response.json();
  console.log('✅ API Health Check:', JSON.stringify(data));
  
  // Test video upload URL endpoint
  console.log('\n📤 Testing Video Upload URL...');
  const uploadResponse = await fetch(`${API_BASE}/videos/upload-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: 'test.mp4',
      contentType: 'video/mp4',
      ownerId: 'test-user'
    })
  });
  
  if (uploadResponse.ok) {
    const uploadData = await uploadResponse.json();
    console.log('✅ Upload URL Generated:', uploadData.videoId);
  } else {
    console.log('❌ Upload URL Failed:', uploadResponse.status);
  }
  
} catch (error) {
  console.error('❌ API Test Failed:', error.message);
}