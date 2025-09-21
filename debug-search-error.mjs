// Test the TwelveLabs search functionality to debug the "Response body disturbed" error
import { TwelveLabsRetriever } from './apps/api/src/services/twelvelabs.js';
import { Db } from './apps/api/src/services/db.js';

async function debugTwelveLabsSearch() {
  console.log('🔍 Debugging TwelveLabs search issue...\n');

  try {
    // Test with the video ID from the error
    const videoId = '45833844-0973-4e59-be29-220d06ba734a';
    
    console.log('📹 Looking up video:', videoId);
    const video = await Db.getVideo(videoId);
    
    if (!video) {
      console.error('❌ Video not found in database');
      return;
    }

    console.log('✅ Video found:', {
      status: video.status,
      taskId: video.taskId,
      title: video.title
    });

    if (!video.taskId) {
      console.error('❌ Video has no taskId - indexing not complete');
      return;
    }

    console.log('\n🔎 Testing TwelveLabs search...');
    const retriever = new TwelveLabsRetriever();
    
    // Test with a simple query first
    console.log('Query: "overview of the lecture"');
    
    const searchResult = await retriever.searchVideo({
      videoId: videoId,
      taskId: video.taskId,
      query: 'overview of the lecture',
      limit: 5
    });

    console.log('✅ Search completed successfully!');
    console.log('Results:', searchResult.length, 'hits');
    
    searchResult.forEach((hit, i) => {
      console.log(`  ${i + 1}. [${hit.startSec}s-${hit.endSec}s] ${hit.text?.substring(0, 100)}...`);
    });

  } catch (error) {
    console.error('❌ Search failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    // Check if it's the specific "Response body disturbed" error
    if (error.message.includes('disturbed') || error.message.includes('locked')) {
      console.log('\n🔧 This is the "Response body disturbed" error!');
      console.log('💡 This usually happens when a fetch response is read multiple times.');
      console.log('💡 The fix is to properly handle the response object in the TwelveLabs client.');
    }
  }
}

debugTwelveLabsSearch();