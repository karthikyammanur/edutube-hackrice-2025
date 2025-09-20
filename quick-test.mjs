// Quick test for API endpoints
const BASE_URL = "http://127.0.0.1:3000";

async function testEndpoint(name, url, options = {}) {
  try {
    console.log(`\n🧪 Testing ${name}...`);
    const response = await fetch(`${BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    console.log(`✅ ${name}: ${response.status} ${response.statusText}`);
    
    const data = await response.text();
    if (data) {
      console.log(`📄 Response: ${data.substring(0, 200)}${data.length > 200 ? '...' : ''}`);
    }
    
    return response;
  } catch (error) {
    console.log(`❌ ${name} failed: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log("🚀 Starting endpoint tests...\n");
  
  // Test health check
  await testEndpoint("Health Check", "/health");
  
  // Test search endpoint (this previously caused crashes)
  await testEndpoint("Search (without query)", "/api/search", {
    method: 'POST',
    body: JSON.stringify({})
  });
  
  // Test search with query
  await testEndpoint("Search (with query)", "/api/search", {
    method: 'POST',
    body: JSON.stringify({
      query: "test query",
      indexId: "test-index"
    })
  });
  
  console.log("\n🏁 All tests completed!");
}

runTests().catch(console.error);