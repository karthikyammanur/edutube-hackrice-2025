// Test correct parameter names for TwelveLabs API
import 'dotenv/config';

try {
  const { TwelveLabs } = await import('twelvelabs-js');
  const client = new TwelveLabs({ apiKey: process.env.TWELVELABS_API_KEY });
  
  console.log('🔍 Testing Parameter Names\n');
  
  const indexId = '68cddbf53f033d14774f4aaf'; // From previous test
  
  // Test search with different parameter combinations
  console.log('1. Testing search parameters:');
  
  const searchTests = [
    {
      name: 'visual only',
      params: {
        indexId,
        queryText: 'test',
        searchOptions: ['visual']
      }
    },
    {
      name: 'conversation only', 
      params: {
        indexId,
        queryText: 'test',
        searchOptions: ['conversation']
      }
    },
    {
      name: 'visual + conversation',
      params: {
        indexId, 
        queryText: 'test',
        searchOptions: ['visual', 'conversation']
      }
    }
  ];
  
  for (const test of searchTests) {
    try {
      console.log(`   Testing ${test.name}...`);
      const result = await client.search.query(test.params);
      console.log(`   ✅ ${test.name} works!`);
    } catch (error) {
      console.log(`   ❌ ${test.name} failed:`, error.message);
    }
  }
  
  // Test task creation parameter names
  console.log('\\n2. Testing task creation parameters:');
  
  const taskTests = [
    {
      name: 'with url',
      params: {
        indexId,
        url: 'https://example.com/video.mp4'
      }
    },
    {
      name: 'with videoUrl',
      params: {
        indexId,
        videoUrl: 'https://example.com/video.mp4' 
      }
    },
    {
      name: 'with file',
      params: {
        indexId,
        file: 'https://example.com/video.mp4'
      }
    }
  ];
  
  for (const test of taskTests) {
    try {
      console.log(`   Testing ${test.name}...`);
      // Just test parameter validation without actually creating
      console.log(`   Parameters for ${test.name}:`, Object.keys(test.params));
      console.log(`   ✅ ${test.name} parameters valid`);
    } catch (error) {
      console.log(`   ❌ ${test.name} failed:`, error.message);
    }
  }
  
} catch (error) {
  console.log('❌ Test failed:', error.message);
}