// Test correct TwelveLabs API structure
import 'dotenv/config';

console.log('🔍 Testing Correct TwelveLabs API Structure\n');

try {
  const { TwelveLabs } = await import('twelvelabs-js');
  const client = new TwelveLabs({ apiKey: process.env.TWELVELABS_API_KEY });
  
  console.log('1. Testing indexes object:');
  console.log('   Available methods:', Object.keys(client.indexes));
  console.log('   Method types:', Object.keys(client.indexes).map(k => `${k}: ${typeof client.indexes[k]}`));
  
  // Test the indexes methods
  console.log('\n2. Testing indexes.list():');
  if (typeof client.indexes.list === 'function') {
    const result = await client.indexes.list();
    console.log('   ✅ indexes.list() works!');
    console.log('   📋 Result:', result);
    console.log('   📊 Data count:', result.data?.length || 0);
  } else {
    console.log('   ❌ indexes.list is not a function');
  }
  
  console.log('\n3. Testing other available methods:');
  const methodsToTest = Object.keys(client.indexes).filter(k => typeof client.indexes[k] === 'function');
  for (const method of methodsToTest) {
    console.log(`   📌 ${method}(): ${typeof client.indexes[method]}`);
  }
  
  console.log('\n4. Testing correct REST API endpoint:');
  // Try different API versions
  const endpoints = [
    'https://api.twelvelabs.io/v1.2/indexes',
    'https://api.twelvelabs.io/v1/indexes', 
    'https://api.twelvelabs.io/indexes'
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          'x-api-key': process.env.TWELVELABS_API_KEY,
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`   ${endpoint}: ${response.status}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`   ✅ SUCCESS! Found ${data.data?.length || 0} indexes`);
        break;
      }
    } catch (error) {
      console.log(`   ❌ ${endpoint}: ${error.message}`);
    }
  }
  
} catch (error) {
  console.log('❌ Test failed:', error.message);
}