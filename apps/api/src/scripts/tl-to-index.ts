import 'dotenv/config';
import { TwelveLabsRetriever } from '../services/twelvelabs.js';

interface Args {
  videoId?: string;
  taskId?: string;
  query?: string;
  limit?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const n = argv[i + 1];
    if (a === '--video-id' && n) { args.videoId = n; i++; }
    else if (a === '--task-id' && n) { args.taskId = n; i++; }
    else if (a === '--query' && n) { args.query = n; i++; }
    else if (a === '--limit' && n) { args.limit = Number(n); i++; }
  }
  return args;
}

function ts(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

async function main() {
  const { videoId, taskId, query = 'content', limit = 8 } = parseArgs(process.argv);
  if (!videoId) {
    console.error('Usage: tsx src/scripts/tl-to-index.ts --video-id <ID> [--task-id <ID>] [--query "text"] [--limit N]');
    process.exit(1);
  }

  const retriever = new TwelveLabsRetriever();
  const hits = await retriever.searchVideo({ videoId, taskId: taskId || videoId, query, limit });

  if (!hits.length) {
    console.log('No segments found.');
    return;
  }

  // Print minimal lecture index style
  console.log(`Video: ${videoId}`);
  for (const h of hits) {
    const start = ts(h.startSec);
    const end = ts(h.endSec);
    const text = (h.text || '').replace(/\s+/g, ' ').trim();
    console.log(`[${start}] Segment: ${text || 'Visual segment'} — captions: "${text.slice(0, 120)}${text.length > 120 ? '...' : ''}"`);
  }
}

main().catch(err => {
  console.error('Error:', err?.message || err);
  process.exit(1);
});


