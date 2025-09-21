// Test script for TwelveLabs semantic search
//
// Usage examples:
// - General index search (no specific video):
//   npm run test:tl-search -- --query "explain binary search"
//
// - Video-specific search (keeps TL ranking and filters by a given video):
//   npm run test:tl-search -- --query "hash tables" --videoId YOUR_VIDEO_ID --taskId YOUR_TASK_ID --limit 5
//
// Environment:
//   Requires TWELVELABS_API_KEY to be set.
//   Optionally uses your default TwelveLabs index (first index in the account).

import 'dotenv/config';
import { TwelveLabsRetriever, SearchHit } from '../services/twelvelabs';

interface Args {
  query?: string;
  videoId?: string;
  taskId?: string;
  limit?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    const take = (v?: string) => {
      i += 1;
      return v;
    };
    switch (a) {
      case '--query':
      case '-q':
        args.query = take(next);
        break;
      case '--videoId':
      case '-v':
        args.videoId = take(next);
        break;
      case '--taskId':
      case '-t':
        args.taskId = take(next);
        break;
      case '--limit':
      case '-n':
        args.limit = Number(take(next));
        break;
      default:
        // Support "key=value" form
        if (a.startsWith('--query=')) args.query = a.split('=')[1];
        else if (a.startsWith('--videoId=')) args.videoId = a.split('=')[1];
        else if (a.startsWith('--taskId=')) args.taskId = a.split('=')[1];
        else if (a.startsWith('--limit=')) args.limit = Number(a.split('=')[1]);
        break;
    }
  }
  return args;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`${name} env var is required`);
  }
  return v;
}

function printHeader(title: string) {
  console.log('\n=== ' + title + ' ===');
}

function printHits(hits: SearchHit[]) {
  if (hits.length === 0) {
    console.log('No results found.');
    return;
  }
  hits.forEach((h, i) => {
    console.log(
      `${i + 1}. videoId=${h.videoId}  t=${h.startSec.toFixed(1)}-${h.endSec.toFixed(1)}s  conf=${h.confidence.toFixed(2)}\n   text: ${h.text}\n   deepLink: ${h.deepLink}`
    );
  });
}

async function main() {
  try {
    // Ensure API key is present early for a clear error if missing.
    requireEnv('TWELVELABS_API_KEY');

    const { query, videoId, taskId, limit = 10 } = parseArgs(process.argv.slice(2));
    if (!query) {
      console.error('Missing required --query.');
      console.error('Example: npm run test:tl-search -- --query "what is dynamic programming"');
      process.exit(1);
    }

    const retriever = new TwelveLabsRetriever();

    // Mode A: general semantic search across the default index (no videoId required)
    printHeader('General semantic search (index-wide)');
    const docs = await retriever.getRelevantDocuments(query);
    if (docs.length === 0) {
      console.log('No index-wide results found.');
    } else {
      docs.slice(0, limit).forEach((d: any, i: number) => {
        const meta = d.metadata || {};
        console.log(
          `${i + 1}. videoId=${meta.videoId ?? 'unknown'}  t=${meta.start ?? '?'}-${meta.end ?? '?'}s  conf=${(meta.confidence ?? '?')}\n   content: ${d.pageContent}`
        );
      });
    }

    // Mode B: video-scoped search with TL ranking (requires a videoId; taskId optional)
    if (videoId) {
      printHeader('Video-scoped semantic search (keeps TL ranking)');
      let effectiveTaskId = taskId ?? '';
      try {
        const hits = await retriever.searchVideo({
          videoId,
          taskId: effectiveTaskId,
          query,
          limit,
        });
        printHits(hits);
      } catch (err: any) {
        console.error('Video-scoped search failed:', err?.message || err);
        process.exitCode = 2;
      }
    } else {
      printHeader('Video-scoped semantic search skipped');
      console.log('Provide --videoId (and optionally --taskId) to test video-scoped ranking.');
    }
  } catch (err: any) {
    console.error('Fatal error:', err?.message || err);
    process.exit(1);
  }
}

main();
