import 'dotenv/config';
import { TwelveLabs } from 'twelvelabs-js';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required`);
  return v;
}

interface Args { videoId?: string; query?: string; limit?: number }

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const n = argv[i + 1];
    if (a === '--video-id' && n) { args.videoId = n; i++; }
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
  const { videoId, query = 'content', limit = 8 } = parseArgs(process.argv);
  if (!videoId) {
    console.error('Usage: tsx src/scripts/tl-conversation-test.ts --video-id <ID> [--query "text"] [--limit N]');
    process.exit(1);
  }

  const apiKey = requireEnv('TWELVELABS_API_KEY');
  const client = new TwelveLabs({ apiKey });

  const indexes = await client.indexes.list();
  if (!indexes.data || indexes.data.length === 0) throw new Error('No indexes found');
  const indexId = indexes.data[0].id!;

  console.log(`Using index: ${indexId}`);
  console.log('Searching with conversation modality...');

  const resp = await client.search.query({
    indexId,
    queryText: query,
    searchOptions: ['conversation'],
    pageLimit: limit
  } as any);

  const data: any[] = (resp as any)?.data || [];
  const filtered = data.filter(d => (d.videoId || d.video_id) === videoId);
  const results = (filtered.length ? filtered : data).slice(0, limit);

  if (results.length === 0) {
    console.log('No conversation results. Likely transcript modality is not available for this index/video.');
    return;
  }

  results.forEach((r: any, i: number) => {
    const start = r.start ?? r.startSec ?? 0;
    const end = r.end ?? r.endSec ?? start;
    const text = r.text || r.metadata?.text || '';
    console.log(`${i + 1}. [${ts(start)}-${ts(end)}] ${text}`);
  });
}

main().catch(err => {
  console.error('Error:', err?.message || err);
  process.exit(1);
});


