// Quick service integration test
import 'dotenv/config';

console.log('🔍 Testing Service Integrations...\n');

// Test TwelveLabs API
console.log('1. TwelveLabs API Status:');
try {
  const { TwelveLabs } = await import('twelvelabs-js');
  const client = new TwelveLabs({ apiKey: process.env.TWELVELABS_API_KEY });
  const indexes = await client.index.list();
  console.log('   ✅ TwelveLabs: WORKING -', indexes.data?.length || 0, 'indexes found');
} catch (error) {
  console.log('   ❌ TwelveLabs: FAILED -', error.message);
}

// Test Google Cloud (simple connection test)
console.log('\n2. Google Cloud Services:');
try {
  const { Firestore } = await import('@google-cloud/firestore');
  const db = new Firestore({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'test-project'
  });
  console.log('   ⚠️  Firestore: CONFIGURED (connection not tested without credentials)');
} catch (error) {
  console.log('   ❌ Firestore: FAILED -', error.message);
}

try {
  const { Storage } = await import('@google-cloud/storage');
  const storage = new Storage({
    projectId: process.env.GOOGLE_CLOUD_PROJECT || 'test-project'
  });
  console.log('   ⚠️  GCS: CONFIGURED (connection not tested without credentials)');
} catch (error) {
  console.log('   ❌ GCS: FAILED -', error.message);
}

// Test Gemini AI
console.log('\n3. Gemini AI:');
try {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || 'dummy-key');
  console.log('   ⚠️  Gemini: CONFIGURED (will fail without valid API key)');
} catch (error) {
  console.log('   ❌ Gemini: FAILED -', error.message);
}

console.log('\n4. Environment Variables:');
console.log('   TWELVELABS_API_KEY:', process.env.TWELVELABS_API_KEY ? 'SET ✅' : 'MISSING ❌');
console.log('   GOOGLE_CLOUD_PROJECT:', process.env.GOOGLE_CLOUD_PROJECT ? 'SET ✅' : 'MISSING ❌');
console.log('   GCS_BUCKET:', process.env.GCS_BUCKET ? 'SET ✅' : 'MISSING ❌');
console.log('   GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'SET (dummy) ⚠️' : 'MISSING ❌');
console.log('   TWELVELABS_WEBHOOK_SECRET:', process.env.TWELVELABS_WEBHOOK_SECRET ? 'SET ✅' : 'MISSING ❌');