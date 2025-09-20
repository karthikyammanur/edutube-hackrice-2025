// Test script for video Q&A using TwelveLabs embeddings + Gemini analysis
//
// Usage:
//   npm run test:video-qa -- --question "What are the main concepts discussed?" [--video-id VIDEO_ID] [--visual]
//
// Requirements:
//   - TWELVELABS_API_KEY env var set
//   - GOOGLE_API_KEY env var set (for visual analysis)

import 'dotenv/config';
import { VideoAnalysisService } from '../services/video-analysis';

interface Args {
  question?: string;
  videoId?: string;
  visual?: boolean;
  help?: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const take = () => argv[++i];
    switch (true) {
      case a === '--question' || a === '-q':
        args.question = take();
        break;
      case a.startsWith('--question='):
        args.question = a.split('=')[1];
        break;
      case a === '--video-id' || a === '-v':
        args.videoId = take();
        break;
      case a.startsWith('--video-id='):
        args.videoId = a.split('=')[1];
        break;
      case a === '--visual':
        args.visual = true;
        break;
      case a === '--help' || a === '-h':
        args.help = true;
        break;
    }
  }
  return args;
}

function printUsage() {
  console.log(`
Video Q&A Test Script

Usage:
  npm run test:video-qa -- --question "Your question here" [options]

Options:
  --question, -q    Question to ask about the video (required)
  --video-id, -v    Specific video ID to analyze (optional, uses cached test video)
  --visual          Enable visual analysis with Gemini Vision (requires GOOGLE_API_KEY)
  --help, -h        Show this help message

Examples:
  # Basic question using embeddings only
  npm run test:video-qa -- --question "What topics are covered?"
  
  # Visual analysis (requires GOOGLE_API_KEY)
  npm run test:video-qa -- --question "What do you see in the slides?" --visual
  
  # Specific video
  npm run test:video-qa -- --question "Explain the main concept" --video-id "68ceea3bc81f4a8a93036b98"

Environment Variables:
  TWELVELABS_API_KEY    Required for semantic search
  GOOGLE_API_KEY        Required for visual analysis (--visual flag)
`);
}

async function loadCachedVideoId(): Promise<string | null> {
  try {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const cacheFile = path.resolve(__dirname, '.testvideo-cache.json');
    
    const data = await fs.readFile(cacheFile, 'utf8');
    const cache = JSON.parse(data);
    return cache.videoId || null;
  } catch (error) {
    return null;
  }
}

function printHeader(title: string) {
  console.log(`\n🎯 ${title}`);
  console.log('='.repeat(50));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printUsage();
    return;
  }

  if (!args.question) {
    console.error('❌ Question is required. Use --question "Your question here"');
    console.log('\nUse --help for usage information.');
    process.exit(1);
  }

  try {
    // Get video ID from cache or use provided one
    let videoId = args.videoId;
    if (!videoId) {
      videoId = await loadCachedVideoId();
      if (!videoId) {
        console.error('❌ No video ID found. Either:');
        console.error('   1. Run the search-testvideo-smart script first to cache a test video');
        console.error('   2. Provide a video ID with --video-id VIDEO_ID');
        process.exit(1);
      }
      console.log(`📹 Using cached video ID: ${videoId}`);
    }

    printHeader('Video Q&A Analysis');
    
    console.log(`❓ Question: "${args.question}"`);
    console.log(`🎥 Video ID: ${videoId}`);
    console.log(`👁️  Visual Analysis: ${args.visual ? 'Enabled' : 'Disabled (embeddings only)'}`);
    
    const analysisService = new VideoAnalysisService();

    if (args.visual) {
      // Full analysis with visual content
      printHeader('Running Enhanced Analysis (Embeddings + Vision)');
      
      const result = await analysisService.analyzeVideo({
        videoId,
        taskId: videoId,
        question: args.question,
        maxSegments: 3,
        includeVisualAnalysis: true
      });

      console.log(`\n💬 **Answer:**`);
      console.log(result.answer);
      console.log(`\n📊 **Confidence:** ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`🔍 **Source:** ${result.source}`);
      
      if (result.segments.length > 0) {
        console.log(`\n📽️  **Analyzed Segments:**`);
        result.segments.forEach((segment, i) => {
          const startTime = `${Math.floor(segment.startSec / 60)}:${(segment.startSec % 60).toFixed(0).padStart(2, '0')}`;
          const endTime = `${Math.floor(segment.endSec / 60)}:${(segment.endSec % 60).toFixed(0).padStart(2, '0')}`;
          console.log(`${i + 1}. [${startTime}-${endTime}] Relevance: ${(segment.relevance * 100).toFixed(1)}%`);
          console.log(`   ${segment.description.slice(0, 200)}${segment.description.length > 200 ? '...' : ''}`);
          console.log('');
        });
      }
      
    } else {
      // Quick analysis using embeddings only
      printHeader('Running Basic Analysis (Embeddings Only)');
      
      const answer = await analysisService.quickAnalysis(videoId, args.question);
      console.log(answer);
    }
    
    console.log(`\n✅ Analysis complete!`);
    
  } catch (error: any) {
    console.error(`\n❌ Error: ${error?.message || error}`);
    
    if (error?.message?.includes('GOOGLE_API_KEY')) {
      console.error(`\n💡 Tip: Get your Google API key from https://aistudio.google.com/`);
      console.error('   Add it to your .env file as: GOOGLE_API_KEY=your_key_here');
    }
    
    process.exit(1);
  }
}

main();