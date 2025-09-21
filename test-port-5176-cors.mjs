// Test CORS with the correct port 5176
import fetch from 'node-fetch';

async function testPort5176Cors() {
  console.log('🔍 Testing CORS configuration for port 5176...\n');

  try {
    // Get a signed URL first
    console.log('📡 Getting signed URL...');
    const response = await fetch('http://localhost:3000/videos/upload-url', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fileName: 'port-5176-test.mp4',
        contentType: 'video/mp4'
      })
    });

    const data = await response.json();
    console.log('✅ Signed URL received for VideoID:', data.videoId);

    // Test CORS preflight with port 5176
    console.log('\n🌐 Testing CORS preflight from port 5176...');
    const corsUrl = data.url;
    
    const corsResponse = await fetch(corsUrl, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:5176',
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

    if (corsResponse.status === 200 && corsHeaders['access-control-allow-origin'] === 'http://localhost:5176') {
      console.log('\n🎉 CORS Configuration is working for port 5176!');
      console.log('✅ Your "Failed to fetch" error should now be resolved');
    } else {
      console.log('\n❌ CORS Configuration issue detected for port 5176');
      console.log('Expected origin: http://localhost:5176');
      console.log('Actual origin:', corsHeaders['access-control-allow-origin']);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPort5176Cors();