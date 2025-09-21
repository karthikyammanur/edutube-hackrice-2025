import 'dotenv/config';
import { Firestore } from '@google-cloud/firestore';

console.log('🔍 Testing Firestore Database Connectivity...\n');

console.log('Environment Variables:');
console.log('  GOOGLE_CLOUD_PROJECT:', process.env.GOOGLE_CLOUD_PROJECT || 'NOT SET');

try {
  console.log('\n🔧 Creating Firestore client...');
  const firestore = new Firestore({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
    ignoreUndefinedProperties: true,
  });
  console.log('✅ Firestore client created successfully');

  console.log('\n📋 Testing database connectivity...');
  
  // Test write operation
  const testDoc = {
    id: 'test-' + Date.now(),
    title: 'Test Video',
    status: 'uploaded',
    createdAt: new Date().toISOString(),
    extra: { test: true }
  };
  
  console.log('   Writing test document...');
  await firestore.collection('videos').doc(testDoc.id).set(testDoc);
  console.log('   ✅ Test document written successfully');
  
  // Test read operation
  console.log('   Reading test document...');
  const doc = await firestore.collection('videos').doc(testDoc.id).get();
  if (doc.exists) {
    console.log('   ✅ Test document read successfully');
    const data = doc.data();
    console.log(`   Document title: ${data.title}`);
  }
  
  // Test collection listing
  console.log('   Testing collection query...');
  const snapshot = await firestore.collection('videos').limit(5).get();
  console.log(`   ✅ Found ${snapshot.size} documents in collection`);
  
  // Clean up test document
  console.log('   Cleaning up test document...');
  await firestore.collection('videos').doc(testDoc.id).delete();
  console.log('   ✅ Test document deleted');

  console.log('\n✅ Firestore database is working correctly!');
  
} catch (error) {
  console.error('\n❌ Firestore test failed:', error.message);
  
  if (error.message.includes('Could not load the default credentials')) {
    console.log('\n💡 Credential Issues Detected:');
    console.log('   Same GCP credentials needed as for Cloud Storage');
    console.log('   1. Install Google Cloud CLI');
    console.log('   2. Run: gcloud auth application-default login');
    console.log('   3. Or set GOOGLE_APPLICATION_CREDENTIALS');
  }
  
  if (error.message.includes('PERMISSION_DENIED')) {
    console.log('\n💡 Permission Issues:');
    console.log('   1. Enable Firestore API in Google Cloud Console');
    console.log('   2. Grant Firestore permissions to your credentials');
    console.log('   3. Create Firestore database if not exists');
  }
  
  process.exit(1);
}