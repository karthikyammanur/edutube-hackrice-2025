console.log('🔍 Starting simple API test...');

try {
  console.log('Testing connection to http://127.0.0.1:3000/health');
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
  
  const response = await fetch('http://127.0.0.1:3000/health', {
    signal: controller.signal
  });
  
  clearTimeout(timeoutId);
  
  console.log('✅ Connected! Status:', response.status);
  
  if (response.ok) {
    const data = await response.json();
    console.log('✅ Health check response:', JSON.stringify(data));
  } else {
    console.log('❌ Bad response:', response.statusText);
  }
  
} catch (error) {
  console.log('❌ Connection failed:');
  console.log('  Error name:', error.name);
  console.log('  Error message:', error.message);
  
  if (error.name === 'AbortError') {
    console.log('  → Request timed out after 5 seconds');
  } else if (error.code === 'ECONNREFUSED') {
    console.log('  → Connection refused - server may not be running');
  } else {
    console.log('  → Unknown error:', error);
  }
}

console.log('Test completed.');