// Test with URL parameter for TwelveLabs
import 'dotenv/config';

try {
  const { TwelveLabs } = await import('twelvelabs-js');
  const client = new TwelveLabs({ apiKey: process.env.TWELVELABS_API_KEY });
  
  console.log('🔍 Testing URL-based task creation\n');
  
  const indexId = '68cddbf53f033d14774f4aaf';
  
  // Test URL parameter (not videoFile for file uploads)
  const testUrl = 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4';
  
  console.log('Testing URL parameter...');
  try {
    const task = await client.tasks.create({
      indexId,
      url: testUrl
    });
    console.log('✅ URL parameter works! Task ID:', task.id);
  } catch (error) {
    console.log('❌ URL parameter failed:', error.message.substring(0, 200));
  }
  
  console.log('\\nTesting videoUrl parameter...');
  try {
    const task = await client.tasks.create({
      indexId,
      videoUrl: testUrl
    });
    console.log('✅ videoUrl parameter works! Task ID:', task.id);
  } catch (error) {
    console.log('❌ videoUrl parameter failed:', error.message.substring(0, 200));
  }
  
} catch (error) {
  console.log('❌ Test failed:', error.message);
}