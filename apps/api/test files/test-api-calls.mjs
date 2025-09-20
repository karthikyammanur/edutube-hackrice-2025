// Test the correct TwelveLabs API calls to understand the proper structure
import 'dotenv/config';

try {
  const { TwelveLabs } = await import('twelvelabs-js');
  const client = new TwelveLabs({ apiKey: process.env.TWELVELABS_API_KEY });
  
  console.log('🔍 Testing Actual TwelveLabs API Calls\n');
  
  // 1. Get indexes to understand structure
  console.log('1. Testing indexes.list():');
  const indexes = await client.indexes.list();
  console.log('   ✅ Success! Structure:');
  console.log('   📋 First index:', JSON.stringify(indexes.data[0], null, 2));
  
  const indexId = indexes.data[0].id;
  console.log(`   🎯 Using index ID: ${indexId}`);
  
  // 2. Test tasks.create to understand parameters
  console.log('\n2. Testing tasks structure:');
  console.log('   Available tasks methods:', Object.getOwnPropertyNames(client.tasks).filter(name => typeof client.tasks[name] === 'function'));
  
  // 3. Test search structure
  console.log('\n3. Testing search structure:');
  console.log('   Available search methods:', Object.getOwnPropertyNames(client.search).filter(name => typeof client.search[name] === 'function'));
  
  // 4. Try a simple search to understand the API
  try {
    const searchResult = await client.search.query({
      indexId,
      query: 'test search',
      searchOptions: ['visual']
    });
    console.log('   ✅ Search query works!');
    console.log('   📊 Search result structure:', Object.keys(searchResult));
  } catch (searchError) {
    console.log('   ⚠️ Search failed:', searchError.message);
  }
  
  // 5. Test creating a task (if we have a video URL)
  console.log('\n4. Testing task creation (dry run):');
  try {
    // This is just to see what parameters are expected
    console.log('   Tasks create method signature test...');
    // Don't actually create - just test the method exists
    console.log('   ✅ tasks.create method exists:', typeof client.tasks.create);
  } catch (taskError) {
    console.log('   ⚠️ Task test failed:', taskError.message);
  }
  
} catch (error) {
  console.log('❌ Test failed:', error.message);
  console.log('Stack trace:', error.stack);
}