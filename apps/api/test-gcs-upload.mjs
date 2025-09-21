// Test GCS upload workflow
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

async function testGCSUpload() {
  try {
    console.log('🧪 Testing GCS Upload Workflow...\n');
    
    // Step 1: Get signed upload URL
    console.log('1️⃣ Requesting signed upload URL...');
    const uploadUrlResponse = await fetch('http://localhost:3000/videos/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        fileName: 'test-upload.txt', 
        contentType: 'text/plain' 
      })
    });
    
    if (!uploadUrlResponse.ok) {
      throw new Error(`Upload URL request failed: ${uploadUrlResponse.status}`);
    }
    
    const { videoId, url, objectName } = await uploadUrlResponse.json();
    console.log('✅ Got signed URL for videoId:', videoId);
    console.log('📁 Object name:', objectName);
    
    // Step 2: Upload test content to GCS
    console.log('\n2️⃣ Uploading test content to GCS...');
    const testContent = 'This is a test file for GCS upload validation.';
    
    const gcsUploadResponse = await fetch(url, {
      method: 'PUT',
      body: testContent,
      headers: { 'Content-Type': 'text/plain' }
    });
    
    console.log('📤 GCS Upload Response Status:', gcsUploadResponse.status);
    console.log('📤 GCS Upload Response Headers:', Object.fromEntries(gcsUploadResponse.headers.entries()));
    
    if (!gcsUploadResponse.ok) {
      const errorBody = await gcsUploadResponse.text();
      throw new Error(`GCS upload failed: ${gcsUploadResponse.status} ${gcsUploadResponse.statusText}\nBody: ${errorBody}`);
    }
    
    console.log('✅ Content uploaded to GCS successfully!');
    
    // Step 3: Test signed download URL to verify file exists
    console.log('\n3️⃣ Testing if file is accessible via download URL...');
    
    const downloadUrlResponse = await fetch(`http://localhost:3000/videos/${videoId}/download-url?fileName=test-upload.txt`);
    if (!downloadUrlResponse.ok) {
      throw new Error(`Download URL request failed: ${downloadUrlResponse.status}`);
    }
    
    const { url: downloadUrl } = await downloadUrlResponse.json();
    console.log('🔗 Got download URL, testing access...');
    
    const fileAccessResponse = await fetch(downloadUrl);
    console.log('📥 File Access Response Status:', fileAccessResponse.status);
    
    if (fileAccessResponse.ok) {
      const content = await fileAccessResponse.text();
      console.log('✅ File accessible! Content:', content);
    } else {
      console.log('❌ File not accessible via download URL');
      const errorBody = await fileAccessResponse.text();
      console.log('Error body:', errorBody);
    }
    
    console.log('\n🎉 GCS upload workflow test completed!');
    
  } catch (error) {
    console.error('\n❌ GCS upload workflow test failed:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
}

testGCSUpload();