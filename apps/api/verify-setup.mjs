import 'dotenv/config';
import { Storage } from '@google-cloud/storage';

console.log('🔧 Google Cloud Setup Verification Tool');
console.log('=====================================\n');

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

const bucketName = process.env.GCS_BUCKET;

async function verifySetup() {
  console.log(`📋 Checking project: ${process.env.GOOGLE_CLOUD_PROJECT}`);
  console.log(`🪣 Checking bucket: ${bucketName}\n`);

  try {
    // Test 1: Check if bucket exists
    console.log('1️⃣ Testing bucket access...');
    const bucket = storage.bucket(bucketName);
    const [exists] = await bucket.exists();
    
    if (exists) {
      console.log('✅ Bucket exists and is accessible!');
      
      // Get bucket metadata
      const [metadata] = await bucket.getMetadata();
      console.log(`   📍 Location: ${metadata.location}`);
      console.log(`   🏷️  Storage Class: ${metadata.storageClass}`);
      
      // Test signed URL generation
      console.log('\n2️⃣ Testing signed URL generation...');
      const [uploadUrl] = await bucket.file('test/sample.mp4').getSignedUrl({
        version: 'v4',
        action: 'write',
        expires: Date.now() + 15 * 60 * 1000,
        contentType: 'video/mp4',
      });
      console.log('✅ Upload signed URL generated successfully!');
      
    } else {
      console.log('❌ Bucket does not exist');
      console.log('\n💡 Quick Fix Options:');
      console.log('1. Go to: https://console.cloud.google.com/storage/browser?project=' + process.env.GOOGLE_CLOUD_PROJECT);
      console.log('2. Click "CREATE BUCKET"');
      console.log(`3. Name it: ${bucketName}`);
      console.log('4. Choose location and create');
      
      console.log('\n🔄 Or try a different bucket name (must be globally unique):');
      const timestamp = Date.now();
      console.log(`   Suggestion: edutube-hackrice-${timestamp}`);
    }

    console.log('\n3️⃣ Testing Firestore connectivity...');
    
    // Test Firestore without importing the service (to avoid module issues)
    const testUrl = `http://localhost:3000/health`;
    const response = await fetch(testUrl);
    if (response.ok) {
      console.log('✅ API server is running');
      
      // Test video endpoint (which uses Firestore)
      console.log('\n4️⃣ Testing video metadata storage...');
      try {
        const uploadResponse = await fetch('http://localhost:3000/videos/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: 'setup-test.mp4', contentType: 'video/mp4' })
        });
        
        if (uploadResponse.ok) {
          console.log('✅ Upload URL generation working!');
          const data = await uploadResponse.json();
          console.log(`   🆔 Video ID: ${data.videoId}`);
        } else {
          console.log('❌ Upload URL generation failed');
          const error = await uploadResponse.json();
          console.log(`   Error: ${error.error}`);
        }
      } catch (e) {
        console.log('❌ API endpoint test failed:', e.message);
      }
    } else {
      console.log('❌ API server not responding');
      console.log('   Make sure: npx tsx src/index.ts is running');
    }

  } catch (error) {
    console.error('\n❌ Setup verification failed:', error.message);
    
    if (error.message.includes('credentials')) {
      console.log('\n💡 Credential Issues:');
      console.log('   Check that hackrice-api-key.json exists and has correct path');
    }
    
    if (error.message.includes('permission') || error.message.includes('403')) {
      console.log('\n💡 Permission Issues:');
      console.log('   Service account needs Storage Admin role');
    }
  }

  console.log('\n📊 SETUP CHECKLIST:');
  console.log('□ Service account key file exists');
  console.log('□ GCS bucket created and accessible'); 
  console.log('□ Firestore API enabled');
  console.log('□ Service account has proper roles');
  console.log('□ API server running');
  console.log('\n✅ Complete all items above for full functionality!');
}

verifySetup();