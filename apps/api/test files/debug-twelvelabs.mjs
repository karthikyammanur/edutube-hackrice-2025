// Debug TwelveLabs API connection
import 'dotenv/config';

console.log('🔍 TwelveLabs API Debug Test\n');

// Test 1: Check SDK import and version
console.log('1. Testing SDK Import...');
try {
  const { TwelveLabs } = await import('twelvelabs-js');
  console.log('   ✅ SDK imported successfully');
  console.log('   📦 TwelveLabs constructor:', typeof TwelveLabs);
} catch (error) {
  console.log('   ❌ SDK import failed:', error.message);
  process.exit(1);
}

// Test 2: Check environment variables
console.log('\n2. Environment Variables:');
const apiKey = process.env.TWELVELABS_API_KEY;
console.log('   API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
if (!apiKey) {
  console.log('   ❌ TWELVELABS_API_KEY is missing');
  process.exit(1);
}

// Test 3: Test client initialization
console.log('\n3. Testing Client Initialization...');
let client;
try {
  const { TwelveLabs } = await import('twelvelabs-js');
  client = new TwelveLabs({ apiKey });
  console.log('   ✅ Client initialized');
  console.log('   📋 Client properties:', Object.keys(client));
  console.log('   🔍 Index property:', typeof client.index);
  
  if (client.index) {
    console.log('   🔍 Index methods:', Object.keys(client.index));
  }
} catch (error) {
  console.log('   ❌ Client initialization failed:', error.message);
  process.exit(1);
}

// Test 4: Test different method names
console.log('\n4. Testing API Methods...');
const methodsToTest = ['list', 'listIndexes', 'getAll', 'retrieve'];

for (const method of methodsToTest) {
  try {
    if (client.index && typeof client.index[method] === 'function') {
      console.log(`   ✅ Found method: index.${method}()`);
      
      // Try calling it
      const result = await client.index[method]();
      console.log(`   ✅ ${method}() succeeded:`, result?.data?.length || 0, 'items');
      break; // Success, no need to test others
    } else {
      console.log(`   ❌ Method index.${method}() not found`);
    }
  } catch (error) {
    console.log(`   ⚠️  Method index.${method}() failed:`, error.message);
  }
}

// Test 5: Raw REST API test
console.log('\n5. Testing Raw REST API...');
try {
  const response = await fetch('https://api.twelvelabs.io/v1.2/indexes', {
    headers: {
      'x-api-key': apiKey,
      'Content-Type': 'application/json'
    }
  });
  
  console.log('   📡 REST API Status:', response.status);
  
  if (response.ok) {
    const data = await response.json();
    console.log('   ✅ REST API succeeded:', data.data?.length || 0, 'indexes');
    console.log('   📋 Sample index:', data.data?.[0]?.id || 'none');
  } else {
    const errorText = await response.text();
    console.log('   ❌ REST API failed:', errorText);
  }
} catch (error) {
  console.log('   ❌ REST API error:', error.message);
}

// Test 6: Check SDK docs/examples
console.log('\n6. SDK Structure Analysis...');
try {
  const { TwelveLabs } = await import('twelvelabs-js');
  const testClient = new TwelveLabs({ apiKey });
  
  console.log('   🔍 Available top-level properties:');
  Object.keys(testClient).forEach(key => {
    console.log(`     - ${key}: ${typeof testClient[key]}`);
  });
  
  if (testClient.index) {
    console.log('   🔍 Available index methods:');
    Object.keys(testClient.index).forEach(key => {
      console.log(`     - index.${key}: ${typeof testClient.index[key]}`);
    });
  }
} catch (error) {
  console.log('   ❌ Structure analysis failed:', error.message);
}