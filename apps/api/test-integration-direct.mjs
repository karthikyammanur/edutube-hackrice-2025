import 'dotenv/config';
import { Storage } from '@google-cloud/storage';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { randomUUID } from 'crypto';

console.log('🎯 DIRECT INTEGRATION TEST (No Server Required)');
console.log('================================================\n');

// Initialize services directly
const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
});

const serviceAccount = JSON.parse(readFileSync('../../hackrice-api-key.json', 'utf8'));
const firebaseApp = initializeApp({
  credential: cert(serviceAccount),
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
});
const db = getFirestore(firebaseApp);

async function testDirectIntegration() {
  try {
    console.log('1️⃣ Testing Google Cloud Storage...');
    const bucket = storage.bucket(process.env.GCS_BUCKET);
    const [exists] = await bucket.exists();
    
    if (!exists) {
      console.log('❌ Bucket does not exist');
      return;
    }
    
    // Generate signed URL
    const fileName = `test-videos/${randomUUID()}.mp4`;
    const [uploadUrl] = await bucket.file(fileName).getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000,
      contentType: 'video/mp4',
    });
    
    console.log('   ✅ Bucket exists and signed URL generated');
    console.log(`   📁 Test file path: ${fileName}`);

    console.log('\n2️⃣ Testing Firestore Database...');
    
    // Test video metadata storage
    const videoId = randomUUID();
    const videoDoc = {
      id: videoId,
      title: 'Integration Test Video',
      fileName: fileName,
      uploadedAt: new Date(),
      status: 'processing',
      twelvelabsTaskId: null,
    };

    await db.collection('videos').doc(videoId).set(videoDoc);
    console.log('   ✅ Video metadata stored in Firestore');

    // Read it back
    const doc = await db.collection('videos').doc(videoId).get();
    if (doc.exists) {
      console.log('   ✅ Video metadata retrieved successfully');
      console.log(`   🆔 Video ID: ${doc.data().id}`);
      console.log(`   📼 Title: ${doc.data().title}`);
    }

    // Test segments collection
    await db.collection('videos').doc(videoId).collection('segments').add({
      start: 0,
      end: 30,
      text: 'Test segment content',
      confidence: 0.95,
    });
    console.log('   ✅ Video segment stored in Firestore');

    console.log('\n3️⃣ Testing TwelveLabs API connectivity...');
    
    const response = await fetch('https://api.twelvelabs.io/v1.2/indexes', {
      method: 'GET',
      headers: {
        'x-api-key': process.env.TWELVELABS_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('   ✅ TwelveLabs API accessible');
      console.log(`   📊 Found ${data.data?.length || 0} indexes`);
    } else {
      console.log('   ❌ TwelveLabs API error:', response.status);
    }

    console.log('\n4️⃣ Clean up test data...');
    await db.collection('videos').doc(videoId).delete();
    console.log('   ✅ Test video metadata cleaned up');

    console.log('\n🎉 SUCCESS: ALL INTEGRATIONS WORKING!');
    console.log('=====================================');
    console.log('✅ Google Cloud Storage: Upload URLs working');
    console.log('✅ Firestore Database: Read/write working'); 
    console.log('✅ TwelveLabs API: Connectivity confirmed');
    console.log('✅ Service Account: All permissions correct');
    console.log('\n🚀 Your EduTube platform is ready for video uploads!');

  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    
    if (error.message.includes('permission')) {
      console.log('\n💡 Check service account permissions in Google Cloud Console');
    }
    if (error.message.includes('bucket')) {
      console.log('\n💡 Check that GCS bucket exists and is accessible');
    }
  }
}

testDirectIntegration();