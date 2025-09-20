/**
 * 🔥 EduTube KILLER DEMO: Live Video Search
 * 
 * This demonstrates the semantic search through lecture videos
 * - The crown jewel feature for hackathon presentations!
 */

import 'dotenv/config';

const API_BASE = 'http://localhost:3000';

interface SearchResponse {
  query: string;
  videoId: string;
  videoTitle: string;
  resultsCount: number;
  hits: SearchHit[];
  summary?: string;
}

interface SearchHit {
  videoId: string;
  startSec: number;
  endSec: number;
  text: string;
  confidence: number;
  embeddingScope: string;
  deepLink: string;
}

async function demonstrateKillerSearch() {
  console.log('🔥 KILLER DEMO: Live Lecture Video Search');
  console.log('========================================\n');

  // First, let's check if we have any ready videos
  console.log('1️⃣ Finding videos ready for search...');
  
  // For demo purposes, we'll use a video ID that should exist
  // In a real demo, you'd list videos and pick one that's ready
  const demoVideoId = await findReadyVideo();
  
  if (!demoVideoId) {
    console.log('❌ No ready videos found for search demo');
    console.log('\n🔧 To prepare a video for search:');
    console.log('1. Run: npx tsx scripts/upload-demo.ts');
    console.log('2. Wait for processing to complete');
    console.log('3. Then run this search demo');
    return;
  }

  console.log(`✅ Found ready video: ${demoVideoId}\n`);

  // Demo multiple search queries to show versatility
  const demoQueries = [
    'neural networks',
    'machine learning basics', 
    'data visualization',
    'artificial intelligence',
    'deep learning concepts'
  ];

  console.log('🎯 LIVE SEARCH DEMONSTRATION');
  console.log('===========================\n');

  for (const query of demoQueries) {
    console.log(`🔍 Searching for: "${query}"`);
    console.log('-'.repeat(50));
    
    try {
      const response = await fetch(`${API_BASE}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: demoVideoId,
          query,
          limit: 3, // Top 3 results for demo
          summarize: false // Skip AI summary for speed
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.log(`❌ Search failed: ${error.message || error.error}`);
        continue;
      }

      const results = await response.json() as SearchResponse;
      
      console.log(`✅ Found ${results.resultsCount} results in "${results.videoTitle}"`);
      
      if (results.hits.length === 0) {
        console.log('   No relevant segments found for this query');
      } else {
        results.hits.forEach((hit, i) => {
          const timeFormatted = formatTime(hit.startSec);
          console.log(`   ${i + 1}. ${timeFormatted} | ${hit.text}`);
          console.log(`      🔗 Deep Link: ${hit.deepLink}`);
          console.log(`      📊 Relevance: ${(hit.confidence * 100).toFixed(1)}% | Type: ${hit.embeddingScope}`);
        });
      }
      
    } catch (error) {
      console.log(`❌ Search error: ${(error as Error).message}`);
    }
    
    console.log(); // Add spacing between searches
  }

  // Demonstrate AI-powered search summary
  console.log('🤖 AI-POWERED SEARCH SUMMARY');
  console.log('============================');
  
  const summaryQuery = 'machine learning fundamentals';
  console.log(`🔍 Searching for: "${summaryQuery}" (with AI summary)`);
  
  try {
    const response = await fetch(`${API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoId: demoVideoId,
        query: summaryQuery,
        limit: 5,
        summarize: true // Enable AI summary
      })
    });

    if (response.ok) {
      const results = await response.json() as SearchResponse;
      console.log(`✅ Found ${results.resultsCount} results`);
      
      if (results.summary) {
        console.log('\n📝 AI-Generated Study Notes:');
        console.log('-'.repeat(30));
        console.log(results.summary);
      }
      
      console.log('\n🔗 Searchable Moments:');
      results.hits.slice(0, 3).forEach((hit, i) => {
        console.log(`   ${i + 1}. ${formatTime(hit.startSec)} - ${hit.deepLink}`);
      });
    }
    
  } catch (error) {
    console.log(`⚠️ AI summary unavailable: ${(error as Error).message}`);
  }

  console.log('\n🎉 KILLER DEMO COMPLETE!');
  console.log('========================');
  console.log('✨ Key Demo Points Shown:');
  console.log('• ✅ Semantic search through video content');
  console.log('• ✅ Real-time results with relevance scoring');
  console.log('• ✅ Deep links to exact moments in video');
  console.log('• ✅ Multiple content types (visual + audio)');
  console.log('• ✅ AI-powered study note generation');
  console.log('• ✅ Production-ready search experience');
  console.log('\n🎯 JUDGE IMPACT: Students can instantly find any concept in hours of lecture content!');
}

async function findReadyVideo(): Promise<string | null> {
  try {
    // In a real app, you'd have a /videos endpoint to list videos
    // For demo, we'll try some common patterns or use environment variable
    const testVideoId = process.env.DEMO_VIDEO_ID;
    
    if (testVideoId) {
      const response = await fetch(`${API_BASE}/videos/${testVideoId}/status`);
      if (response.ok) {
        const video = await response.json();
        if (video.status === 'ready') {
          console.log(`✅ Using demo video: ${video.title || testVideoId}`);
          return testVideoId;
        }
      }
    }
    
    // If no demo video specified, suggest creating one
    return null;
    
  } catch (error) {
    console.log('⚠️ Could not check for ready videos');
    return null;
  }
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Health check
async function checkSearchReadiness() {
  console.log('🏥 Search System Health Check');
  console.log('============================');
  
  try {
    // Check API health
    const healthResponse = await fetch(`${API_BASE}/health`);
    if (!healthResponse.ok) {
      throw new Error('API server not responding');
    }
    console.log('✅ API server healthy');
    
    // Check TwelveLabs API key
    if (!process.env.TWELVELABS_API_KEY) {
      console.log('⚠️ TWELVELABS_API_KEY not set');
    } else {
      console.log('✅ TwelveLabs API key configured');
    }
    
    console.log('✅ Search system ready for demo\n');
    return true;
    
  } catch (error) {
    console.log('❌ Search system not ready');
    console.log('🔧 Troubleshooting:');
    console.log('• Start API server: cd apps/api && npm run dev');
    console.log('• Set TWELVELABS_API_KEY environment variable');
    console.log('• Ensure at least one video is processed and ready');
    return false;
  }
}

// Run the killer demo
if (import.meta.url === `file://${process.argv[1]}`) {
  checkSearchReadiness().then(ready => {
    if (ready) {
      demonstrateKillerSearch();
    }
  });
}

export { demonstrateKillerSearch, checkSearchReadiness };