import { TwelveLabsRetriever } from '../src/services/twelvelabs.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env file from the api directory
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '..', '.env') });

// Helper to ensure environment variables are set
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

// Test video embedding functionality
async function testVideoEmbedding(): Promise<void> {
  console.log('🎬 Testing TwelveLabs video embedding...');
  
  const retriever = new TwelveLabsRetriever();
  
  // You can use any publicly accessible video URL for testing
  // For testing, using a small sample video
  const testVideoUrl = process.env.TEST_VIDEO_URL || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
  
  console.log(`📹 Uploading video: ${testVideoUrl}`);
  
  try {
    // Upload and create embedding task
    const taskId = await retriever.uploadVideo({
      videoUrl: testVideoUrl,
      modelName: 'Marengo-retrieval-2.7',
      videoClipLength: 10 // 10-second clips for faster processing
    });
    
    console.log(`✅ Video upload task created: ${taskId}`);
    
    // Wait for embedding to complete
    console.log('⏳ Waiting for embedding to complete...');
    await retriever.waitForEmbedding();
    
    // Test document retrieval
    console.log('📄 Testing document retrieval...');
    const documents = await retriever.getRelevantDocuments("show me the video content");
    
    console.log(`📊 Found ${documents.length} document segments:`);
    documents.forEach((doc, index) => {
      console.log(`\n📄 Document ${index + 1}:`);
      console.log(`   Content: ${doc.pageContent}`);
      console.log(`   Metadata:`, {
        embeddingScope: doc.metadata.embeddingScope,
        embeddingOption: doc.metadata.embeddingOption,
        startTime: doc.metadata.startOffsetSec,
        endTime: doc.metadata.endOffsetSec,
        embeddingLength: doc.metadata.embeddingLength
      });
    });
    
    // Get full embeddings
    console.log('🔢 Retrieving full embeddings...');
    const embeddings = await retriever.getEmbeddings();
    
    if (embeddings?.videoEmbedding?.segments) {
      console.log(`📈 Total embedding segments: ${embeddings.videoEmbedding.segments.length}`);
      
      // Show first few embedding values for each segment
      embeddings.videoEmbedding.segments.slice(0, 3).forEach((segment, index) => {
        const firstFew = segment.float?.slice(0, 5) || [];
        console.log(`\n🧮 Segment ${index + 1}:`);
        console.log(`   Scope: ${segment.embeddingScope}`);
        console.log(`   Option: ${segment.embeddingOption}`);
        console.log(`   Time: ${segment.startOffsetSec}s - ${segment.endOffsetSec}s`);
        console.log(`   Embeddings preview: [${firstFew.join(', ')}...] (total: ${segment.float?.length} values)`);
      });
    }
    
    console.log('\n🎉 All tests completed successfully!');
    console.log(`💾 Task ID: ${taskId}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('=== TwelveLabs Embedding Test Script ===');
    console.log('This script will test the TwelveLabs embedding integration\n');
    
    // Verify API key
    const apiKey = requireEnv('TWELVELABS_API_KEY');
    console.log(`🔑 Using API key: ${apiKey.substring(0, 10)}...`);
    
    // Run the test
    await testVideoEmbedding();
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

// Run the test
main();