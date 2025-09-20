// Check the exact TypeScript interface for task creation
import 'dotenv/config';

try {
  const { TwelveLabs } = await import('twelvelabs-js');
  
  // Create a test to see what parameters the tasks.create method expects
  console.log('🔍 Checking tasks.create interface\n');
  
  const client = new TwelveLabs({ apiKey: process.env.TWELVELABS_API_KEY });
  
  // Try different parameter names to see which ones work
  const indexId = '68cddbf53f033d14774f4aaf';
  
  const testParams = [
    { name: 'url', params: { indexId, url: 'test' } },
    { name: 'videoUrl', params: { indexId, videoUrl: 'test' } },
    { name: 'file', params: { indexId, file: 'test' } },
    { name: 'video_url', params: { indexId, video_url: 'test' } }
  ];
  
  for (const test of testParams) {
    try {
      console.log(`Testing parameter: ${test.name}`);
      // This will fail but give us type information
      await client.tasks.create(test.params);
    } catch (error) {
      if (error.message.includes('required') || error.message.includes('parameter')) {
        console.log(`   ✅ ${test.name} parameter accepted (validation error expected)`);
        console.log(`   Error: ${error.message.substring(0, 100)}...`);
      } else {
        console.log(`   ❌ ${test.name} parameter rejected: ${error.message.substring(0, 100)}...`);
      }
    }
  }
  
  // Also check if there are other required fields
  console.log('\\nTrying minimal valid request...');
  try {
    await client.tasks.create({ indexId });
  } catch (error) {
    console.log('Required fields error:', error.message);
  }
  
} catch (error) {
  console.log('❌ Test failed:', error.message);
}