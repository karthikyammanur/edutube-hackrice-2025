/**
 * Demo script for video upload and TwelveLabs indexing workflow
 * 
 * This demonstrates the complete flow:
 * 1. POST /videos/upload-url - Get signed upload URL and video ID
 * 2. Upload video to GCS (simulated)
 * 3. POST /videos - Trigger TwelveLabs indexing
 */

import 'dotenv/config';

const API_BASE = 'http://localhost:3000';

async function demoVideoUploadWorkflow() {
  console.log('🎬 EduTube Video Upload & Indexing Demo');
  console.log('=======================================\n');

  try {
    // Step 1: Get signed upload URL
    console.log('1️⃣ Getting signed upload URL...');
    const uploadResponse = await fetch(`${API_BASE}/videos/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'demo-video.mp4',
        contentType: 'video/mp4',
        ownerId: 'demo-user-123'
      })
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload URL request failed: ${uploadResponse.statusText}`);
    }
    
    const { videoId, url, objectName } = await uploadResponse.json();
    console.log(`✅ Generated upload URL for video: ${videoId}`);
    console.log(`   GCS Object: ${objectName}`);
    console.log(`   Upload URL: ${url.substring(0, 100)}...`);
    console.log();

    // Step 2: Simulate video upload to GCS
    console.log('2️⃣ Simulating video upload to GCS...');
    console.log('   (In real app, client would PUT video file to the signed URL)');
    console.log('   ✅ Video uploaded successfully');
    console.log();

    // Step 3: Trigger TwelveLabs indexing
    console.log('3️⃣ Triggering TwelveLabs indexing...');
    const indexResponse = await fetch(`${API_BASE}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: videoId,
        title: 'Demo Video - Big Buck Bunny Clip',
        description: 'A sample video for testing TwelveLabs integration'
      })
    });

    if (!indexResponse.ok) {
      throw new Error(`Indexing request failed: ${indexResponse.statusText}`);
    }

    const videoMetadata = await indexResponse.json();
    console.log('✅ TwelveLabs indexing initiated');
    console.log(`   Video ID: ${videoMetadata.id}`);
    console.log(`   Status: ${videoMetadata.status}`);
    console.log(`   Task ID: ${videoMetadata.taskId || 'N/A'}`);
    console.log();

    // Step 4: Check video status
    console.log('4️⃣ Checking video metadata...');
    const statusResponse = await fetch(`${API_BASE}/videos/${videoId}`);
    if (statusResponse.ok) {
      const status = await statusResponse.json();
      console.log('✅ Video metadata retrieved');
      console.log(`   Title: ${status.title}`);
      console.log(`   Status: ${status.status}`);
      console.log(`   Created: ${status.createdAt}`);
      console.log(`   Task ID: ${status.taskId || 'N/A'}`);
    }

    console.log('\n🎉 Demo completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Video upload URL generated ✅');
    console.log('- Video metadata stored in Firestore ✅');
    console.log('- TwelveLabs indexing triggered ✅');
    console.log('- API endpoints working correctly ✅');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('- Ensure API server is running on port 3000');
    console.log('- Check TWELVELABS_API_KEY environment variable');
    console.log('- Verify GCS_BUCKET environment variable');
  }
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  demoVideoUploadWorkflow();
}

export { demoVideoUploadWorkflow };