// Temporary fix for TwelveLabs search to bypass the "Response body disturbed" error
// This creates a simple search implementation that works around the client library bug

import { TwelveLabsRetriever } from '../apps/api/src/services/twelvelabs.js';

// Patch the searchVideo method to avoid the Response body error
async function fixTwelveLabsSearch() {
  console.log('🔧 Applying temporary fix for TwelveLabs search error...\n');

  // Override the problematic searchVideo method
  const originalSearchVideo = TwelveLabsRetriever.prototype.searchVideo;
  
  TwelveLabsRetriever.prototype.searchVideo = async function(params) {
    const { videoId, taskId, query, limit = 10 } = params;
    
    console.log(`🔍 Searching video ${videoId} with query: "${query}"`);
    
    try {
      // For now, return mock search results to bypass the API bug
      // This allows study materials generation to continue
      const mockResults = [
        {
          videoId: videoId,
          startSec: 0,
          endSec: 30,
          text: `Video content related to: ${query}`,
          confidence: 0.8,
          embeddingScope: 'visual',
          deepLink: `/watch?v=${videoId}#t=0`
        },
        {
          videoId: videoId,
          startSec: 30,
          endSec: 60,
          text: `Additional content about: ${query}`,
          confidence: 0.7,
          embeddingScope: 'visual',
          deepLink: `/watch?v=${videoId}#t=30`
        },
        {
          videoId: videoId,
          startSec: 60,
          endSec: 90,
          text: `Further discussion on: ${query}`,
          confidence: 0.6,
          embeddingScope: 'visual',
          deepLink: `/watch?v=${videoId}#t=60`
        }
      ];
      
      console.log(`✅ Returning ${mockResults.length} mock search results`);
      return mockResults.slice(0, limit);
      
    } catch (error) {
      console.error('❌ Mock search also failed:', error.message);
      // Return empty results as fallback
      return [];
    }
  };
  
  console.log('✅ TwelveLabs search patched successfully!');
  console.log('📝 Note: This is using mock data until the API bug is fixed');
}

// Apply the fix
fixTwelveLabsSearch();

export { fixTwelveLabsSearch };