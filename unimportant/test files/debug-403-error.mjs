// Debug 403 error with detailed testing
import fetch from 'node-fetch';

async function debug403Error() {
  console.log('🐛 Debugging 403 GCS upload error...\n');

  try {
    // Step 1: Get signed URL
    console.log('📡 Step 1: Getting signed URL...');
    const response = await fetch('http://localhost:3000/videos/upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName: 'debug403.mp4',
        contentType: 'video/mp4'
      })
    });

    const data = await response.json();
    console.log('✅ Signed URL received for VideoID:', data.videoId);
    console.log('🔗 Signed URL length:', data.url.length);
    console.log('🔗 URL starts with:', data.url.substring(0, 100) + '...');

    // Step 2: Test OPTIONS (preflight)
    console.log('\n🌐 Step 2: Testing CORS preflight...');
    const corsResponse = await fetch(data.url, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5176',
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'content-type'
      }
    });

    console.log('CORS Status:', corsResponse.status);
    if (corsResponse.status !== 200) {
      console.log('❌ CORS preflight failed');
      return;
    }
    console.log('✅ CORS preflight successful');

    // Step 3: Test actual PUT request with minimal data
    console.log('\n📤 Step 3: Testing actual PUT upload...');
    const testContent = Buffer.from('test video content for debugging 403');
    
    const uploadResponse = await fetch(data.url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Origin': 'http://localhost:5176'
      },
      body: testContent
    });

    console.log('Upload Response Status:', uploadResponse.status);
    console.log('Upload Response Headers:');
    const responseHeaders = {};
    for (const [key, value] of uploadResponse.headers.entries()) {
      responseHeaders[key] = value;
    }
    console.log(JSON.stringify(responseHeaders, null, 2));

    if (uploadResponse.status === 200) {
      console.log('✅ Upload successful!');
    } else {
      console.log('❌ Upload failed with status:', uploadResponse.status);
      const responseText = await uploadResponse.text();
      console.log('Error response body:', responseText);
    }

    // Step 4: Check service account permissions
    console.log('\n🔐 Step 4: Checking service account permissions...');
    const { Storage } = await import('@google-cloud/storage');
    const storage = new Storage({ keyFilename: './hackrice-api-key.json' });
    
    const bucket = storage.bucket('hackrice-videobucket');
    const [bucketExists] = await bucket.exists();
    console.log('Bucket exists:', bucketExists);
    
    if (bucketExists) {
      const [metadata] = await bucket.getMetadata();
      console.log('Bucket location:', metadata.location);
      console.log('Bucket storage class:', metadata.storageClass);
    }

  } catch (error) {
    console.error('❌ Debug test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

debug403Error();