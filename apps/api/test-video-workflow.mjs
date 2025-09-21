// Test browser-like video upload workflow
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

async function testVideoUploadWorkflow() {
  try {
    console.log('🎥 Testing Video Upload Workflow...\n');
    
    // Step 1: Get signed upload URL for video
    console.log('1️⃣ Requesting signed upload URL for video...');
    const uploadUrlResponse = await fetch('http://localhost:3000/videos/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        fileName: 'testvideo.mp4', 
        contentType: 'video/mp4' 
      })
    });
    
    if (!uploadUrlResponse.ok) {
      throw new Error(`Upload URL request failed: ${uploadUrlResponse.status}`);
    }
    
    const { videoId, url, objectName } = await uploadUrlResponse.json();
    console.log('✅ Got signed URL for videoId:', videoId);
    console.log('📁 Object name:', objectName);
    console.log('🔗 Upload URL:', url.substring(0, 100) + '...');
    
    // Step 2: Read the test video file
    console.log('\n2️⃣ Reading test video file...');
    const videoPath = path.join(process.cwd(), 'scripts', 'testvideo.mp4');
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Test video not found at: ${videoPath}`);
    }
    
    const videoBuffer = fs.readFileSync(videoPath);
    console.log('✅ Video file loaded:', videoBuffer.length, 'bytes');
    
    // Step 3: Upload video to GCS (simulate browser behavior)
    console.log('\n3️⃣ Uploading video to GCS...');
    const gcsUploadResponse = await fetch(url, {
      method: 'PUT',
      body: videoBuffer,
      headers: { 'Content-Type': 'video/mp4' }
    });
    
    console.log('📤 GCS Upload Response Status:', gcsUploadResponse.status);
    console.log('📤 GCS Upload Response Headers:', Object.fromEntries(gcsUploadResponse.headers.entries()));
    
    if (!gcsUploadResponse.ok) {
      const errorBody = await gcsUploadResponse.text();
      throw new Error(`GCS upload failed: ${gcsUploadResponse.status} ${gcsUploadResponse.statusText}\nBody: ${errorBody}`);
    }
    
    console.log('✅ Video uploaded to GCS successfully!');
    
    // Step 4: Wait a moment for upload to complete
    console.log('\n4️⃣ Waiting for upload to stabilize...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 5: Test signed download URL to verify file exists
    console.log('\n5️⃣ Testing if video is accessible via download URL...');
    
    const downloadUrlResponse = await fetch(`http://localhost:3000/videos/${videoId}/download-url?fileName=testvideo.mp4`);
    if (!downloadUrlResponse.ok) {
      throw new Error(`Download URL request failed: ${downloadUrlResponse.status}`);
    }
    
    const { url: downloadUrl } = await downloadUrlResponse.json();
    console.log('🔗 Got download URL, testing access...');
    
    const fileAccessResponse = await fetch(downloadUrl, { method: 'HEAD' }); // Just check headers
    console.log('📥 File Access Response Status:', fileAccessResponse.status);
    console.log('📥 File Access Response Headers:', Object.fromEntries(fileAccessResponse.headers.entries()));
    
    if (fileAccessResponse.ok) {
      const contentLength = fileAccessResponse.headers.get('content-length');
      console.log('✅ Video file accessible! Content-Length:', contentLength);
    } else {
      console.log('❌ Video file not accessible via download URL');
      const errorBody = await fileAccessResponse.text();
      console.log('Error body:', errorBody);
      return;
    }
    
    // Step 6: Trigger TwelveLabs processing
    console.log('\n6️⃣ Triggering TwelveLabs processing...');
    
    const processingResponse = await fetch('http://localhost:3000/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        id: videoId, 
        title: 'testvideo.mp4' 
      })
    });
    
    console.log('🔄 Processing Response Status:', processingResponse.status);
    
    if (processingResponse.ok) {
      const processingResult = await processingResponse.json();
      console.log('✅ Processing initiated:', processingResult.status);
      if (processingResult.extra?.error) {
        console.log('⚠️  Processing error:', processingResult.extra.error);
      }
    } else {
      const errorBody = await processingResponse.text();
      console.log('❌ Processing failed:', errorBody);
    }
    
    console.log('\n🎉 Video upload workflow test completed!');
    
  } catch (error) {
    console.error('\n❌ Video upload workflow test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testVideoUploadWorkflow();