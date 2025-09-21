import 'dotenv/config';
import { TwelveLabsRetriever } from '../services/twelvelabs.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Args {
  videoId?: string;
  taskId?: string;
  query?: string;
  limit?: number;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required`);
  return v;
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

async function extractConceptsAndCaption(gen: GoogleGenerativeAI, text: string) {
  // No fallback. Throw on any error.
  const model = gen.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `You are extracting metadata for a lecture segment.
Return strict JSON with keys concepts (array of 1-3 concise phrases) and caption (one sentence paraphrase, 6-18 words).
No extra commentary. If insufficient info, still produce your best guess.

TEXT:\n${text}`;

  const resp = await model.generateContent(prompt);
  const raw = await resp.response.text();
  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    // Some models wrap JSON in code fences
    const m = raw.match(/```json[\s\S]*?```|```[\s\S]*?```/);
    const body = m ? m[0].replace(/```json|```/g, '').trim() : raw.trim();
    parsed = JSON.parse(body);
  }
  if (!Array.isArray(parsed.concepts) || typeof parsed.caption !== 'string') {
    throw new Error('Model output missing required fields');
  }
  return { concepts: parsed.concepts.slice(0, 3), caption: parsed.caption.trim() };
}

async function main() {
  const { videoId, taskId, query = 'content', limit = 6 } = parseArgs(process.argv);
  if (!videoId) {
    console.error('Usage: tsx src/scripts/tl-to-index-enriched.ts --video-id <ID> [--task-id <ID>] [--query "text"] [--limit N]');
    process.exit(1);
  }

  const GOOGLE_API_KEY = requireEnv('GOOGLE_API_KEY');
  const gen = new GoogleGenerativeAI(GOOGLE_API_KEY);

  const retriever = new TwelveLabsRetriever();
  const hits = await retriever.searchVideo({ videoId, taskId: taskId || videoId, query, limit });

  if (!hits.length) {
    console.log('No segments found.');
    return;
  }

  console.log(`Video: ${videoId}`);
  for (const h of hits) {
    const start = ts(h.startSec);
    const end = ts(h.endSec);
    const snippet = (h.text || '').replace(/\s+/g, ' ').trim();
    try {
      const { concepts, caption } = await extractConceptsAndCaption(gen, snippet || `Visual segment from ${start} to ${end}.`);
      const conceptsStr = concepts.join('; ');
      console.log(`[${start}] Segment: ${snippet || 'Visual segment'} — concepts: ${conceptsStr}; captions: "${caption}"`);
    } catch (err: any) {
      console.error(`[${start}-${end}] Enrichment error:`, err?.message || err);
      process.exitCode = 2;
    }
  }
}

main().catch(err => {
  console.error('Error:', err?.message || err);
  process.exit(1);
});


