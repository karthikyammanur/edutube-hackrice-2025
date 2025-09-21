// Simple CORS test for the GCS bucket
import fetch from 'node-fetch';

async function testCorsConfig() {
  console.log('🔍 Testing CORS configuration...\n');

  try {
    // Get a signed URL first
    console.log('📡 Getting signed URL...');
    const response = await fetch('http://localhost:3000/videos/upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName: 'cors-final-test.mp4',
        contentType: 'video/mp4'
      })
    });

    const data = await response.json();
    console.log('✅ Signed URL received for VideoID:', data.videoId);

    // Test CORS preflight
    console.log('\n🌐 Testing CORS preflight...');
    const corsUrl = data.url;
    
    console.log('Making OPTIONS request to GCS...');
    const corsResponse = await fetch(corsUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5175',
        'Access-Control-Request-Method': 'PUT',
        'Access-Control-Request-Headers': 'content-type'
      }
    });

    console.log('CORS Response Status:', corsResponse.status);
    console.log('CORS Response Headers:');
    
    const corsHeaders = {};
    for (const [key, value] of corsResponse.headers.entries()) {
      if (key.startsWith('access-control')) {
        corsHeaders[key] = value;
      }
    }
    console.log(JSON.stringify(corsHeaders, null, 2));

    if (corsResponse.status === 200 && corsHeaders['access-control-allow-origin']) {
      console.log('\n🎉 CORS Configuration is working correctly!');
      console.log('✅ Browser uploads should now work without "Failed to fetch" errors');
    } else {
      console.log('\n❌ CORS Configuration issue detected');
      console.log('This may still cause "Failed to fetch" errors in browser');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCorsConfig();