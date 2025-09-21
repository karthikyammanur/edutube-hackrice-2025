import 'dotenv/config';
import { Storage } from '@google-cloud/storage';

console.log('🔍 Testing Google Cloud Storage Configuration...\n');

// Check environment variables
console.log('Environment Variables:');
console.log('  GOOGLE_CLOUD_PROJECT:', process.env.GOOGLE_CLOUD_PROJECT || 'NOT SET');
console.log('  GCS_BUCKET:', process.env.GCS_BUCKET || 'NOT SET');
console.log('  GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS || 'NOT SET');

try {
  console.log('\n🔧 Creating Storage client...');
  const storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT,
  });

  console.log('✅ Storage client created successfully');

  if (!process.env.GCS_BUCKET) {
    console.log('❌ GCS_BUCKET not configured - cannot test bucket operations');
    process.exit(1);
  }

  console.log(`\n🪣 Testing bucket access: ${process.env.GCS_BUCKET}`);
  const bucket = storage.bucket(process.env.GCS_BUCKET);
  
  // Test if bucket exists and is accessible
  console.log('   Checking if bucket exists...');
  const [exists] = await bucket.exists();
  console.log(`   Bucket exists: ${exists}`);

  if (exists) {
    console.log('   Testing bucket metadata access...');
    const [metadata] = await bucket.getMetadata();
    console.log(`   ✅ Bucket location: ${metadata.location}`);
    console.log(`   ✅ Bucket storage class: ${metadata.storageClass}`);
  }

  // Test signed URL generation (without actually uploading)
  console.log('\n🔐 Testing signed URL generation...');
  const testObjectName = 'test/sample-video.mp4';
  
  const [uploadUrl] = await bucket.file(testObjectName).getSignedUrl({
    version: 'v4',
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType: 'video/mp4',
  });
  
  console.log('   ✅ Upload signed URL generated successfully');
  console.log(`   URL length: ${uploadUrl.length} chars`);
  
  const [downloadUrl] = await bucket.file(testObjectName).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 60 * 60 * 1000, // 1 hour
  });
  
  console.log('   ✅ Download signed URL generated successfully');
  console.log(`   URL length: ${downloadUrl.length} chars`);

  console.log('\n✅ All GCS tests passed! Storage integration is working.');

} catch (error) {
  console.error('\n❌ GCS Test failed:', error.message);
  
  if (error.message.includes('Could not load the default credentials')) {
    console.log('\n💡 Credential Issues Detected:');
    console.log('   1. Install Google Cloud CLI: https://cloud.google.com/sdk/docs/install');
    console.log('   2. Run: gcloud auth application-default login');
    console.log('   3. Or set GOOGLE_APPLICATION_CREDENTIALS to service account key file');
  }
  
  if (error.message.includes('does not exist') || error.code === 404) {
    console.log('\n💡 Bucket Issues Detected:');
    console.log(`   1. Create bucket "${process.env.GCS_BUCKET}" in Google Cloud Console`);
    console.log('   2. Ensure the bucket name is globally unique');
    console.log('   3. Grant Storage Admin permissions to your credentials');
  }
  
  console.log('\n📋 Next Steps:');
  console.log('   1. Set up Google Cloud credentials');
  console.log('   2. Create/verify GCS bucket exists');
  console.log('   3. Test bucket permissions');
  
  process.exit(1);
}