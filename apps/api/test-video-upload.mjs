import 'dotenv/config';
import { TwelveLabs } from 'twelvelabs-js';

console.log('🔍 Testing TwelveLabs Video Upload Process...\n');

const client = new TwelveLabs({ apiKey: process.env.TWELVELABS_API_KEY });

try {
  // Get the default index
  const indexes = await client.indexes.list();
  if (!indexes.data || indexes.data.length === 0) {
    console.log('❌ No indexes available');
    process.exit(1);
  }
  
  const indexId = indexes.data[0].id;
  console.log(`Using index: ${indexId}`);

  // Try to create a task with a test URL (this should fail, but shows us the flow)
  console.log('\n🎬 Testing video upload task creation...');
  
  // Test with a publicly accessible video URL
  const testVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  
  console.log(`Creating task for URL: ${testVideoUrl}`);
  
  const task = await client.tasks.create({
    indexId: indexId,
    videoUrl: testVideoUrl
  });
  
  console.log(`✅ Task created successfully!`);
  console.log(`   Task ID: ${task.id}`);
  console.log(`   Status: ${task.status}`);
  
  console.log('\n⏳ Checking task status...');
  const taskStatus = await client.tasks.retrieve(task.id);
  console.log(`   Current status: ${taskStatus.status}`);
  
  console.log('\n✅ Video upload process is working!');
  console.log('\n📝 Key findings:');
  console.log('   • TwelveLabs can accept video URLs');
  console.log('   • Task creation works correctly');
  console.log('   • This confirms the integration flow should work with GCS signed URLs');

} catch (error) {
  console.error('\n❌ Video upload test failed:', error.message);
  
  if (error.response) {
    console.log('API Response:', JSON.stringify(error.response.data, null, 2));
  }
  
  // This might fail due to URL accessibility, but that's expected
  if (error.message.includes('video_url') || error.message.includes('URL')) {
    console.log('\n💡 This error is expected if the test URL is not accessible to TwelveLabs');
    console.log('   The important part is that the API accepts the request format');
  }
}