import 'dotenv/config';
import { TwelveLabsRetriever, SearchHit } from '../services/twelvelabs.js';
import { summarize } from '../chains/summarize-chain.js';
import { generateFlashcards } from '../chains/flashcards-chain.js';
import { generateQuiz } from '../chains/quiz-chain.js';
import { TwelveLabs } from 'twelvelabs-js';

function parseArgs(argv: string[]) {
  const args: any = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    const take = () => argv[++i];
    switch (true) {
      case a === '--videoId' || a === '-v': args.videoId = take(); break;
      case a.startsWith('--videoId='): args.videoId = a.split('=')[1]; break;
      case a === '--taskId' || a === '-t': args.taskId = take(); break;
      case a.startsWith('--taskId='): args.taskId = a.split('=')[1]; break;
      case a === '--query' || a === '-q': args.query = take(); break;
      case a.startsWith('--query='): args.query = a.split('=')[1]; break;
      case a === '--hits': args.hits = Number(take()); break;
      case a.startsWith('--hits='): args.hits = Number(a.split('=')[1]); break;
      case a === '--cards': args.cards = Number(take()); break;
      case a.startsWith('--cards='): args.cards = Number(a.split('=')[1]); break;
      case a === '--questions': args.questions = Number(take()); break;
      case a.startsWith('--questions='): args.questions = Number(a.split('=')[1]); break;
    }
  }
  return args;
}

function ts(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

function buildContext(hits: SearchHit[], maxChars: number): string {
  const lines: string[] = [];
  for (const h of hits) {
    const line = `- [${ts(h.startSec)}–${ts(h.endSec)}] ${(h.text || '').replace(/\s+/g, ' ').trim()}`;
    lines.push(line);
    if (lines.join('\n').length > maxChars) { lines.pop(); break; }
  }
  return lines.join('\n');
}

async function debugSdkError(e: any, label = 'SDK error'): Promise<void> {
  try {
    console.error(`\n${label}:`, e?.name || typeof e, e?.message || e);
    if (e?.statusCode !== undefined) console.error('statusCode:', e.statusCode);
    if (e?.body !== undefined) console.error('body (as-is):', e.body);
    const rr = (e as any)?.rawResponse;
    if (rr) {
      console.error('rawResponse meta:', {
        status: rr.status,
        statusText: rr.statusText,
        type: rr.type,
        url: rr.url,
      });
      try {
        const clone = typeof rr.clone === 'function' ? rr.clone() : rr;
        const text = typeof clone.text === 'function' ? await clone.text() : undefined;
        if (text !== undefined) {
          console.error('rawResponse text (first 2000 chars):', String(text).slice(0, 2000));
        }
      } catch (rerr: any) {
        console.error('Failed to read rawResponse text:', rerr?.message || rerr);
      }
    }
  } catch {}
}

async function main() {
  const { videoId, taskId, query, hits = 12, cards = 8, questions = 8 } = parseArgs(process.argv.slice(2));
  if (!videoId) {
    console.error('Usage: tsx src/scripts/study-direct.ts --videoId <id> [--taskId <id>] [--query "overview"] [--hits 12] [--cards 8] [--questions 8]');
    process.exit(1);
  }

  const retriever = new TwelveLabsRetriever();

  let results: SearchHit[] = [];
  if (query && query.trim()) {
    try {
      results = await retriever.searchVideo({ videoId, taskId: taskId || videoId, query: query.trim(), limit: hits });
    } catch (e) {
      await debugSdkError(e, 'Retriever.searchVideo failed');
      try {
        // Fallback: direct SDK search
        const client = new TwelveLabs({ apiKey: process.env.TWELVELABS_API_KEY! });
        const indexes = await client.indexes.list();
        const indexId = indexes.data?.[0]?.id;
        if (!indexId) throw new Error('No index available for fallback search');
        const sr = await client.search.query({ indexId, queryText: query.trim(), searchOptions: ['visual'], pageLimit: Math.max(hits, 50) } as any);
        const res: any[] = (sr as any)?.data || [];
        const filt = res.filter((r: any) => r.videoId === videoId);
        results = (filt.length ? filt : res).slice(0, hits).map((r: any, i: number) => ({
          videoId: r.videoId || videoId,
          startSec: r.start ?? r.startSec ?? 0,
          endSec: r.end ?? r.endSec ?? 0,
          text: r.text || `Visual segment ${i + 1}`,
          confidence: typeof r.confidence === 'number' ? r.confidence : 0.5,
          embeddingScope: 'visual',
          deepLink: `/watch?v=${r.videoId || videoId}#t=${Math.floor(r.start ?? 0)}`,
        }));
      } catch (e2) {
        await debugSdkError(e2, 'SDK fallback search failed');
        throw e2;
      }
    }
  } else {
    const qs = [
      'overview of the lecture',
      'key concepts and definitions',
      'formulas or procedures',
      'important graphics or diagrams',
    ];
    const seen = new Set<string>();
    for (const q of qs) {
      const part = await retriever.searchVideo({ videoId, taskId: taskId || videoId, query: q, limit: Math.ceil(hits / qs.length) });
      for (const h of part) {
        const key = `${Math.round(h.startSec)}-${Math.round(h.endSec)}`;
        if (!seen.has(key)) { results.push(h); seen.add(key); }
      }
    }
    results = results.sort((a, b) => (b.confidence || 0) - (a.confidence || 0) || a.startSec - b.startSec).slice(0, hits);
  }

  const context = buildContext(results, 3500);
  console.log('\n=== Context Preview ===\n');
  console.log(context);

  const summary = await summarize(context, { length: 'medium', tone: 'neutral' });
  console.log('\n=== Summary ===\n');
  console.log(summary);

  // Simple topic detection: pick top headings or first few lines keywords
  const topics: string[] = [];
  const bold = [...summary.matchAll(/\*\*([^*]+)\*\*/g)].map(m => m[1].trim());
  for (const t of bold) { if (t.length > 2 && !topics.includes(t)) topics.push(t); if (topics.length >= 4) break; }
  if (topics.length === 0) topics.push('Key Concepts');

  console.log('\n=== Topics ===\n');
  console.log(JSON.stringify(topics, null, 2));

  for (const t of topics) {
    console.log(`\n=== Flashcards: ${t} ===\n`);
    const fc = await generateFlashcards(summary, { topic: t, count: cards });
    console.log(JSON.stringify(fc, null, 2));

    console.log(`\n=== Quiz: ${t} ===\n`);
    const qz = await generateQuiz(summary, { topic: t, count: questions });
    console.log(JSON.stringify(qz, null, 2));
  }
}

main().catch((e) => {
  console.error('❌ study-direct failed:', e?.message || e);
  process.exit(1);
});


