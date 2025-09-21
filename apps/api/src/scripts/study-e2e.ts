import 'dotenv/config';
import { StudyService } from '../services/study.js';
import { Db } from '../services/db.js';

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    const take = () => argv[++i];
    if (a === '--videoId' || a === '-v') args.videoId = take();
    else if (a.startsWith('--videoId=')) args.videoId = a.split('=')[1];
    else if (a === '--query' || a === '-q') args.query = take();
    else if (a.startsWith('--query=')) args.query = a.split('=')[1];
  }
  return args;
}

async function main() {
  const { videoId, query } = parseArgs(process.argv.slice(2));
  if (!videoId) {
    console.error('Usage: tsx src/scripts/study-e2e.ts --videoId <id> [--query "overview"]');
    process.exit(1);
  }

  console.log('🔎 Checking video readiness...');
  const video = await Db.getVideo(videoId);
  if (!video) throw new Error('Video not found');
  if (video.status !== 'ready' || !video.taskId) {
    console.error(`Video not ready (status=${video.status}, taskId=${video.taskId || 'none'})`);
    process.exit(1);
  }

  console.log('🚀 Generating study materials...');
  const result = await StudyService.generateAll(videoId, {
    query,
    maxHits: 12,
    summaryLength: 'medium',
    summaryTone: 'neutral',
    topicsCount: 4,
    flashcardsPerTopic: 6,
    quizPerTopic: 6,
  });

  console.log('\n=== Summary ===\n');
  console.log(result.summary);

  console.log('\n=== Topics ===\n');
  console.log(JSON.stringify(result.topics, null, 2));

  console.log('\n=== Flashcards (by topic) ===\n');
  for (const t of result.topics) {
    console.log(`\n# ${t}\n`);
    console.log(JSON.stringify(result.flashcardsByTopic[t] || [], null, 2));
  }

  console.log('\n=== Quiz (by topic) ===\n');
  for (const t of result.topics) {
    console.log(`\n# ${t}\n`);
    console.log(JSON.stringify(result.quizByTopic[t] || [], null, 2));
  }

  console.log('\n✅ Done');
}

main().catch((e) => {
  console.error('❌ study-e2e failed:', e?.message || e);
  process.exit(1);
});


