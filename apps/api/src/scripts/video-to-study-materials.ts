// Generate study materials from TwelveLabs video analysis (like test-chains.ts but for video)
import 'dotenv/config';
import { StudyService } from '../services/study.js';

interface Args {
  videoId?: string;
  taskId?: string;
  query?: string;
  length?: "short" | "medium" | "long";
  tone?: string;
  maxTopics?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--video-id" && next) { args.videoId = next; i++; }
    else if (arg === "--task-id" && next) { args.taskId = next; i++; }
    else if (arg === "--query" && next) { args.query = next; i++; }
    else if (arg === "--length" && next) { args.length = next as Args["length"]; i++; }
    else if (arg === "--tone" && next) { args.tone = next; i++; }
    else if (arg === "--max-topics" && next) { args.maxTopics = Number(next) || undefined; i++; }
  }
  return args;
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

async function main() {
  const args = parseArgs(process.argv);
  
  // Use provided video ID or cached one
  let videoId = args.videoId;
  if (!videoId) {
    videoId = await loadCachedVideoId();
    if (!videoId) {
      console.error('❌ No video ID found. Either:');
      console.error('   1. Provide --video-id VIDEO_ID');
      console.error('   2. Run a TwelveLabs test script first to cache a video');
      process.exit(1);
    }
    console.log(`📹 Using cached video ID: ${videoId}`);
  }

  const taskId = args.taskId || videoId; // Fallback to videoId
  const query = args.query || 'lecture content';

  console.log(`\n=== Generating Study Materials from Video ===`);
  console.log(`🎥 Video ID: ${videoId}`);
  console.log(`🔍 Query: "${query}"`);
  console.log(`📝 Length: ${args.length || 'medium'}`);
  console.log(`🎭 Tone: ${args.tone || 'neutral'}\n`);

  try {
    const materials = await StudyService.generateAll(videoId, {
      query,
      maxHits: 10,
      maxContextChars: 4000,
      summaryLength: args.length || "medium",
      summaryTone: args.tone || "neutral",
      topicsCount: args.maxTopics || 8,
      flashcardsPerTopic: 8,
      quizPerTopic: 6,
    });

    console.log(`=== Video Segments Found ===\n`);
    materials.hits.forEach((hit, i) => {
      const start = Math.floor(hit.startSec / 60) + ':' + (hit.startSec % 60).toFixed(0).padStart(2, '0');
      const end = Math.floor(hit.endSec / 60) + ':' + (hit.endSec % 60).toFixed(0).padStart(2, '0');
      console.log(`[${start}-${end}] ${hit.text || 'Visual segment'} (conf: ${hit.confidence.toFixed(2)})`);
    });

    console.log(`\n=== Summary ===\n`);
    console.log(materials.summary);

    console.log(`\n=== Extracted Topics ===\n`);
    console.log(JSON.stringify(materials.topics, null, 2));

    for (const topic of materials.topics) {
      console.log(`\n=== Flashcards for: ${topic} ===\n`);
      const cards = materials.flashcardsByTopic[topic] || [];
      console.log(JSON.stringify(cards, null, 2));

      console.log(`\n=== Quiz for: ${topic} ===\n`);
      const quiz = materials.quizByTopic[topic] || [];
      console.log(JSON.stringify(quiz, null, 2));
    }

    console.log(`\n=== Study Materials Generated Successfully ===`);
    console.log(`📊 Stats:`);
    console.log(`   - ${materials.hits.length} video segments analyzed`);
    console.log(`   - ${materials.topics.length} topics extracted`);
    console.log(`   - ${Object.values(materials.flashcardsByTopic).flat().length} total flashcards`);
    console.log(`   - ${Object.values(materials.quizByTopic).flat().length} total quiz questions`);

  } catch (error: any) {
    console.error('❌ Error generating study materials:', error.message);
    process.exit(1);
  }
}

main();
