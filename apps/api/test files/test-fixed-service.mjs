// Test the fixed TwelveLabs service
import 'dotenv/config';
import { TwelveLabsRetriever } from '../src/services/twelvelabs.js';

async function testTwelveLabsService() {
  console.log('🔍 Testing Fixed TwelveLabs Service\n');
  
  try {
    const retriever = new TwelveLabsRetriever();
    
    console.log('1. Testing search functionality...');
    const documents = await retriever._getRelevantDocuments('test query');
    console.log('   ✅ Search works! Found', documents.length, 'documents');
    
    console.log('2. Testing list segments...');
    const segments = await retriever.listSegments('test-video-id');
    console.log('   ✅ List segments works! Found', segments.length, 'segments');
    
    console.log('3. Testing task details...');
    const taskDetails = await retriever.getTaskDetails();
    console.log('   ✅ Task details works! Result:', taskDetails ? 'Has task' : 'No task set');
    
    console.log('\n🎉 All TwelveLabs service methods are working!');
    
  } catch (error) {
    console.error('❌ Service test failed:', error.message);
  }
}

testTwelveLabsService();