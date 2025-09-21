// Test the complete upload workflow with CORS fix
import fetch from 'node-fetch';
import { FormData, File } from 'formdata-node';
import fs from 'fs';

async function testCompleteWorkflow() {
  console.log('🧪 Testing complete upload workflow after CORS fix...\n');

  try {
    // Step 1: Get upload URL from backend
    console.log('📡 Step 1: Requesting upload URL from backend...');
    const uploadResponse = await fetch('http://localhost:3000/videos/upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5175' // Simulate browser origin
      },
      body: JSON.stringify({
        fileName: 'test-after-cors.mp4',
        contentType: 'video/mp4'
      })
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload URL request failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }

    const uploadData = await uploadResponse.json();
    console.log('✅ Upload URL received - VideoID:', uploadData.videoId);

    // Step 2: Test CORS preflight (simulate browser behavior)
    console.log('\n🌐 Step 2: Testing CORS preflight to GCS...');
    const corsResponse = await fetch(uploadData.uploadUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5175',
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'content-type'
      }
    });

    console.log('CORS Preflight Status:', corsResponse.status);
    console.log('CORS Headers:', Object.fromEntries(
      [...corsResponse.headers.entries()].filter(([key]) => 
        key.startsWith('access-control')
      )
    ));

    if (corsResponse.status !== 200) {
      console.log('⚠️  CORS preflight failed - this would cause "Failed to fetch" in browser');
      return;
    }

    console.log('✅ CORS preflight successful!');

    // Step 3: Upload file to GCS (simulate browser upload)
    console.log('\n📤 Step 3: Uploading file to GCS...');
    
    // Create a small test file
    const testContent = Buffer.from('fake video content for testing');
    
    const gcsResponse = await fetch(uploadData.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Origin': 'http://localhost:5175'
      },
      body: testContent
    });

    console.log('GCS Upload Status:', gcsResponse.status);
    
    if (!gcsResponse.ok) {
      console.log('❌ GCS Upload failed:', gcsResponse.statusText);
      return;
    }

    console.log('✅ File uploaded to GCS successfully!');

    // Step 4: Trigger processing
    console.log('\n⚙️  Step 4: Triggering TwelveLabs processing...');
    const processResponse = await fetch('http://localhost:3000/videos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        id: uploadData.videoId,
        title: 'test-after-cors.mp4'
      })
    });

    if (!processResponse.ok) {
      console.log('⚠️  Processing trigger failed:', processResponse.status);
      return;
    }

    const processData = await processResponse.json();
    console.log('✅ Processing triggered successfully!');
    console.log('TwelveLabs Task ID:', processData.taskId);

    console.log('\n🎉 Complete workflow test SUCCESSFUL!');
    console.log('Your "Failed to fetch" issue should now be resolved in the browser.');

  } catch (error) {
    console.error('❌ Workflow test failed:', error.message);
  }
}

testCompleteWorkflow();