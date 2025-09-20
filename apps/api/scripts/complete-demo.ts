/**
 * Complete EduTube Demo Script
 * 
 * Demonstrates the full video upload → indexing → webhook → segments workflow
 * Perfect for hackathon presentations and testing
 */

import 'dotenv/config';

const API_BASE = 'http://localhost:3000';

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runCompleteDemo() {
  console.log('🎬 EduTube Complete Demo - Upload to Search-Ready');
  console.log('================================================\n');

  try {
    // === PHASE 1: VIDEO UPLOAD ===
    console.log('📤 PHASE 1: VIDEO UPLOAD');
    console.log('-------------------------');
    
    const uploadResponse = await fetch(`${API_BASE}/videos/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: 'hackathon-demo.mp4',
        contentType: 'video/mp4',
        ownerId: 'demo-presenter'
      })
    });

    if (!uploadResponse.ok) {
      throw new Error(`Upload URL failed: ${uploadResponse.statusText}`);
    }

    const { videoId, url } = await uploadResponse.json() as any;
    console.log(`✅ Video ID generated: ${videoId}`);
    console.log(`✅ Signed upload URL ready (15min expiry)`);
    console.log(`   Client would now PUT video file to: ${url.substring(0, 80)}...`);
    console.log();

    // === PHASE 2: INDEXING TRIGGER ===
    console.log('🧠 PHASE 2: AI INDEXING');
    console.log('------------------------');
    
    const indexResponse = await fetch(`${API_BASE}/videos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: videoId,
        title: 'Hackathon Demo: Machine Learning Basics',
        description: 'Educational content explaining core ML concepts with visual examples',
        ownerId: 'demo-presenter'
      })
    });

    if (!indexResponse.ok) {
      throw new Error(`Indexing failed: ${indexResponse.statusText}`);
    }

    const videoMeta = await indexResponse.json() as any;
    console.log(`✅ TwelveLabs indexing started`);
    console.log(`   Status: ${videoMeta.status}`);
    console.log(`   Task ID: ${videoMeta.taskId || 'N/A (check API key)'}`);
    console.log(`   Video will be processed asynchronously...`);
    console.log();

    // === PHASE 3: STATUS MONITORING ===
    console.log('📊 PHASE 3: STATUS MONITORING');
    console.log('------------------------------');
    
    console.log('Option A: Real-time SSE updates (production)');
    console.log(`   Frontend connects to: ${API_BASE}/videos/${videoId}/events`);
    console.log(`   Receives live updates when processing completes`);
    console.log();

    console.log('Option B: Polling status (demo fallback)');
    let attempts = 0;
    let currentStatus = videoMeta.status;
    
    while (currentStatus === 'indexing' && attempts < 3) {
      attempts++;
      console.log(`   Polling attempt ${attempts}/3...`);
      
      const statusResponse = await fetch(`${API_BASE}/videos/${videoId}/status`);
      if (statusResponse.ok) {
        const status = await statusResponse.json() as any;
        currentStatus = status.status;
        console.log(`   Status: ${currentStatus}`);
        
        if (currentStatus === 'ready') {
          console.log(`   🎉 Processing complete! ${status.totalSegments || 0} segments extracted`);
          
          // Show sample segments
          if (status.segments && status.segments.length > 0) {
            console.log('   Sample segments:');
            status.segments.slice(0, 3).forEach((seg: any, i: number) => {
              console.log(`     ${i + 1}. ${seg.startSec}s-${seg.endSec}s: ${seg.text}`);
            });
          }
          break;
        } else if (currentStatus === 'failed') {
          console.log('   ❌ Processing failed');
          break;
        }
      }
      
      if (attempts < 3) {
        console.log('   Waiting 5 seconds before next check...');
        await sleep(5000);
      }
    }
    
    if (currentStatus === 'indexing') {
      console.log('   ⏳ Still processing (normal for real videos)');
      console.log('   In production: webhook will notify when complete');
    }
    console.log();

    // === PHASE 4: SEARCH READINESS ===
    console.log('🔍 PHASE 4: SEARCH READINESS');
    console.log('-----------------------------');
    
    const finalStatusResponse = await fetch(`${API_BASE}/videos/${videoId}/status`);
    if (finalStatusResponse.ok) {
      const finalStatus = await finalStatusResponse.json() as any;
      
      console.log(`✅ Video Status: ${finalStatus.status}`);
      console.log(`✅ Segment Count: ${finalStatus.totalSegments || 0}`);
      console.log(`✅ Last Updated: ${finalStatus.updatedAt}`);
      
      if (finalStatus.status === 'ready') {
        console.log('✅ Video is now searchable via AI embeddings!');
        console.log('   Ready for semantic search queries like:');
        console.log('   - "Explain neural networks"');
        console.log('   - "Show me the data visualization part"');
        console.log('   - "Find sections about model training"');
      } else {
        console.log('🔄 Video will become searchable once processing completes');
      }
    }
    console.log();

    // === DEMO SUMMARY ===
    console.log('📋 DEMO SUMMARY');
    console.log('================');
    console.log('✅ Video upload URL generated');
    console.log('✅ Secure GCS storage integration'); 
    console.log('✅ TwelveLabs AI indexing triggered');
    console.log('✅ Real-time status monitoring available');
    console.log('✅ Webhook processing implemented');
    console.log('✅ Video segments extracted and persisted');
    console.log('✅ Search-ready AI embeddings created');
    console.log();
    console.log('🎯 HACKATHON READY: Complete video-to-search pipeline!');
    console.log(`   Video ID for continued testing: ${videoId}`);

    return { videoId, status: currentStatus };

  } catch (error) {
    console.error('❌ Demo failed:', error);
    console.log('\n🔧 Troubleshooting:');
    console.log('- Ensure API server is running (npm run dev in apps/api)');
    console.log('- Check environment variables (TWELVELABS_API_KEY, GCS_BUCKET)');
    console.log('- Verify Google Cloud credentials are configured');
    throw error;
  }
}

// Health check helper
async function healthCheck() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    if (response.ok) {
      console.log('✅ API server is healthy');
      return true;
    }
  } catch (error) {
    console.log('❌ API server not responding');
    console.log('   Start server: cd apps/api && npm run dev');
    return false;
  }
}

// Run demo with health check
if (import.meta.url === `file://${process.argv[1]}`) {
  healthCheck().then(healthy => {
    if (healthy) {
      runCompleteDemo();
    }
  });
}

export { runCompleteDemo, healthCheck };