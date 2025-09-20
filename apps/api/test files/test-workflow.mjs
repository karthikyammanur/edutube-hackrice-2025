/**
 * Simple workflow test for EduTube
 */

const API_BASE = 'http://localhost:3000';

async function testWorkflow() {
  console.log('🧪 Testing EduTube Workflow');
  console.log('=============================\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing API Health...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ API is healthy:', health);
    } else {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    console.log();

    // Test 2: Upload URL Generation
    console.log('2. Testing Upload URL Generation...');
    const uploadResponse = await fetch(`${API_BASE}/videos/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'test-video.mp4',
        contentType: 'video/mp4',
        ownerId: 'test-user'
      })
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.log('❌ Upload URL generation failed:', uploadResponse.status, errorText);
      return;
    }

    const uploadData = await uploadResponse.json();
    console.log('✅ Upload URL generated successfully');
    console.log(`   Video ID: ${uploadData.videoId}`);
    console.log(`   Upload URL length: ${uploadData.url?.length || 0} chars`);
    console.log();

    // Test 3: Video Metadata Creation
    console.log('3. Testing Video Metadata Creation...');
    const videoResponse = await fetch(`${API_BASE}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: uploadData.videoId,
        title: 'Test Video - EduTube Demo',
        description: 'Testing the EduTube video processing pipeline',
        ownerId: 'test-user'
      })
    });

    if (!videoResponse.ok) {
      const errorText = await videoResponse.text();
      console.log('❌ Video creation failed:', videoResponse.status, errorText);
      return;
    }

    const videoData = await videoResponse.json();
    console.log('✅ Video metadata created successfully');
    console.log(`   Status: ${videoData.status}`);
    console.log(`   Task ID: ${videoData.taskId || 'None (may need API key)'}`);
    console.log();

    // Test 4: Status Check
    console.log('4. Testing Status Endpoint...');
    const statusResponse = await fetch(`${API_BASE}/videos/${uploadData.videoId}/status`);
    
    if (!statusResponse.ok) {
      const errorText = await statusResponse.text();
      console.log('❌ Status check failed:', statusResponse.status, errorText);
      return;
    }

    const statusData = await statusResponse.json();
    console.log('✅ Status endpoint working');
    console.log(`   Current status: ${statusData.status}`);
    console.log(`   Last updated: ${statusData.updatedAt}`);
    console.log();

    // Test 5: Search Endpoint
    console.log('5. Testing Search Endpoint...');
    const searchResponse = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'test video content',
        ownerId: 'test-user'
      })
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.log('❌ Search failed:', searchResponse.status, errorText);
      return;
    }

    const searchData = await searchResponse.json();
    console.log('✅ Search endpoint working');
    console.log(`   Results found: ${searchData.results?.length || 0}`);
    console.log();

    console.log('🎉 WORKFLOW TEST COMPLETE!');
    console.log('===========================');
    console.log('✅ Upload URL generation - WORKING');
    console.log('✅ Video metadata creation - WORKING');
    console.log('✅ Status monitoring - WORKING');
    console.log('✅ Search functionality - WORKING');
    console.log('\n🚀 EduTube core pipeline is functional!');
    console.log(`   Test video ID: ${uploadData.videoId}`);

  } catch (error) {
    console.error('❌ Workflow test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('- Ensure API server is running on port 3000');
    console.log('- Check that all routes are properly registered');
    console.log('- Verify environment variables are configured');
  }
}

testWorkflow();