// Simple test to make HTTP request and see detailed error
import { setTimeout } from 'timers/promises';

async function testServer() {
  console.log('🔍 Testing server with detailed logging...');
  
  try {
    // Wait a bit for server to be ready
    await setTimeout(2000);
    
    console.log('Making fetch request to health endpoint...');
    
    const controller = new AbortController();
    const timeoutId = global.setTimeout(() => {
      console.log('⏰ Request timeout after 5 seconds');
      controller.abort();
    }, 5000);
    
    const response = await fetch('http://127.0.0.1:3000/health', {
      signal: controller.signal,
      headers: {
        'User-Agent': 'EduTube-Test/1.0'
      }
    });
    
    global.clearTimeout(timeoutId);
    
    console.log('✅ Response received!');
    console.log('Status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const body = await response.text();
    console.log('Body:', body);
    
  } catch (error) {
    console.error('❌ Request failed with error:', error.message);
    console.error('Error type:', error.constructor.name);
    console.error('Error cause:', error.cause);
    
    if (error.name === 'AbortError') {
      console.error('Request was aborted (timeout)');
    } else if (error.code) {
      console.error('Error code:', error.code);
    }
  }
}

testServer();