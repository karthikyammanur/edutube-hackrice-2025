import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  keyFilename: './hackrice-api-key.json'
});

const bucketName = 'hackrice-videobucket';
const corsConfiguration = [
  {
    origin: ['http://localhost:5175', 'http://localhost:3000'],
    method: ['GET', 'POST', 'PUT', 'OPTIONS'],
    responseHeader: ['Content-Type', 'x-goog-resumable', 'Authorization'],
    maxAgeSeconds: 3600
  }
];

async function applyCorsConfig() {
  try {
    console.log('🔄 Applying CORS configuration to bucket:', bucketName);
    
    const bucket = storage.bucket(bucketName);
    await bucket.setCorsConfiguration(corsConfiguration);
    
    console.log('✅ CORS configuration applied successfully!');
    
    // Verify the configuration
    const [metadata] = await bucket.getMetadata();
    console.log('📋 Current CORS configuration:');
    console.log(JSON.stringify(metadata.cors, null, 2));
    
  } catch (error) {
    console.error('❌ Error applying CORS configuration:', error.message);
  }
}

applyCorsConfig();