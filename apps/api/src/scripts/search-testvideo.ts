// Test a semantic search query on the bundled test video
//
// Usage:
//   From repo root:
//     npm run -w apps/api test:tl-testvideo -- --query "what are the main goals in the lecture" --limit 8
//   Or from apps/api:
//     npm run test:tl-testvideo -- --query "your query" [--limit 8]
//
// Requirements:
//   - TWELVELABS_API_KEY env var set
//   - GCS_BUCKET env var set
//   - Application Default Credentials for GCS (e.g., `gcloud auth application-default login`)

import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Storage } from '@google-cloud/storage';
import { Gcs } from '../services/storage';
import { TwelveLabsRetriever, SearchHit } from '../services/twelvelabs';

interface Args {
  query?: string;
  limit?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = argv[i + 1];
    const take = () => argv[++i];
    switch (true) {
      case a === '--query' || a === '-q':
        args.query = take();
        break;
      case a.startsWith('--query='):
        args.query = a.split('=')[1];
        break;
      case a === '--limit' || a === '-n':
        args.limit = Number(take());
        break;
      case a.startsWith('--limit='):
        args.limit = Number(a.split('=')[1]);
        break;
    }
  }
  return args;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required`);
  return v;
}

function guessContentType(p: string): string {
  const ext = path.extname(p).toLowerCase();
  if (ext === '.mp4') return 'video/mp4';
  if (ext === '.mov') return 'video/quicktime';
  if (ext === '.mkv') return 'video/x-matroska';
  return 'application/octet-stream';
}

function printHeader(title: string) {
  console.log(`\n=== ${title} ===`);
}

function printHits(hits: SearchHit[]) {
  if (!hits.length) {
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
    requireEnv('TWELVELABS_API_KEY');
    const BUCKET = requireEnv('GCS_BUCKET');

    // Resolve the bundled test video path: apps/api/scripts/testvideo.mp4
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const videoPath = path.resolve(__dirname, '../../scripts/testvideo.mp4');

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Test video not found at ${videoPath}`);
    }

    const { query, limit = 10 } = parseArgs(process.argv.slice(2));
    if (!query) {
      console.error('Usage: npm run test:tl-testvideo -- --query "your question" [--limit 10]');
      process.exit(1);
    }

    // 1) Upload to GCS
    printHeader('Uploading test video to GCS');
    const storage = new Storage();
    const base = path.basename(videoPath);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const objectName = `videos/manual/${stamp}-${base}`;
    const contentType = guessContentType(videoPath);

    await storage.bucket(BUCKET).upload(videoPath, {
      destination: objectName,
      contentType,
      metadata: { contentType },
      validation: false,
    });
    console.log(`Uploaded to gs://${BUCKET}/${objectName}`);

    // 2) Create a signed READ URL so TwelveLabs can fetch it
    const downloadUrl = await Gcs.generateV4DownloadSignedUrl(objectName, 6 * 60 * 60);
    console.log('Signed download URL generated (6h TTL)');

    // 3) Create TwelveLabs task and wait for processing
    printHeader('Indexing with TwelveLabs');
    const retriever = new TwelveLabsRetriever();
    const taskId = await retriever.uploadVideo({ videoUrl: downloadUrl });
    console.log('Task created:', taskId);

    const status = await retriever.waitForProcessing(taskId);
    console.log('Processing status:', (status as any)?.status || 'unknown');

    const taskDetails = await retriever.getTaskDetails();
    // Heuristic to extract videoId from task
    const videoId = (taskDetails as any)?.videoId
      || (taskDetails as any)?.video_id
      || (taskDetails as any)?.video?.id
      || (taskDetails as any)?.video?._id
      || (taskDetails as any)?._id
      || '';

    if (!videoId) {
      throw new Error('Could not determine videoId from TwelveLabs task details.');
    }
    console.log('Resolved videoId:', videoId);

    // 4) Run semantic search scoped to this video
    printHeader('Video-scoped semantic search results');
    const hits = await retriever.searchVideo({ videoId, taskId, query, limit });
    printHits(hits);
  } catch (err: any) {
    console.error('Fatal error:', err?.message || err);
    process.exit(1);
  }
}

main();
