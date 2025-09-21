// Test a semantic search query on the bundled test video
// Optimized version that reuses existing indexed videos instead of re-uploading
//
// Usage:
//   From repo root:
//     npm run -w apps/api test:tl-testvideo-smart -- --query "what are the main goals in the lecture" --limit 8
//   Or from apps/api:
//     npm run test:tl-testvideo-smart -- --query "your query" [--limit 8] [--force-reindex]
//
// Requirements:
//   - TWELVELABS_API_KEY env var set
//   - GCS_BUCKET env var set (only needed if uploading new video)
//   - Application Default Credentials for GCS (e.g., `gcloud auth application-default login`)

import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { Storage } from '@google-cloud/storage';
import { Gcs } from '../services/storage';
import { TwelveLabsRetriever, SearchHit } from '../services/twelvelabs';
import { TwelveLabs } from 'twelvelabs-js';

interface Args {
  query?: string;
  limit?: number;
  forceReindex?: boolean;
}

interface CachedVideo {
  videoId: string;
  taskId: string;
  videoPath: string;
  fileHash: string;
  indexedAt: string;
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
      case a === '--force-reindex' || a === '--force':
        args.forceReindex = true;
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

function calculateFileHash(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

function getCacheFilePath(): string {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  return path.resolve(__dirname, '.testvideo-cache.json');
}

function loadCache(): CachedVideo | null {
  const cacheFile = getCacheFilePath();
  try {
    if (fs.existsSync(cacheFile)) {
      const data = fs.readFileSync(cacheFile, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Could not load cache, will reindex video');
  }
  return null;
}

function saveCache(cache: CachedVideo): void {
  const cacheFile = getCacheFilePath();
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2));
  } catch (error) {
    console.warn('Could not save cache:', error);
  }
}

async function findExistingVideo(client: TwelveLabs, videoHash: string): Promise<{ videoId: string; indexId: string } | null> {
  try {
    const indexes = await client.indexes.list();
    if (!indexes.data || indexes.data.length === 0) {
      return null;
    }

    for (const index of indexes.data) {
      if (!index.id) continue;
      
      try {
        const videos = await client.videos.list(index.id);
        if (videos.data) {
          // Look for videos with matching metadata or recent uploads of test video
          const testVideo = videos.data.find((v: any) => {
            // Check if this looks like our test video based on duration or filename patterns
            const duration = v.metadata?.duration;
            const filename = v.metadata?.filename;
            
            // Heuristic: test videos are usually short and have "test" in name
            return (duration && duration < 600) || // Less than 10 minutes
                   (filename && filename.toLowerCase().includes('test')) ||
                   (v.created_at && new Date(v.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)); // Created in last 24h
          });
          
          if (testVideo) {
            return { videoId: testVideo._id, indexId: index.id };
          }
        }
      } catch (error) {
        console.warn(`Could not list videos in index ${index.id}:`, error);
        continue;
      }
    }
  } catch (error) {
    console.warn('Could not search for existing videos:', error);
  }
  return null;
}

async function main() {
  try {
    requireEnv('TWELVELABS_API_KEY');
    
    // Resolve the bundled test video path
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const videoPath = path.resolve(__dirname, '../../scripts/testvideo.mp4');

    if (!fs.existsSync(videoPath)) {
      throw new Error(`Test video not found at ${videoPath}`);
    }

    const { query, limit = 10, forceReindex = false } = parseArgs(process.argv.slice(2));
    if (!query) {
      console.error('Usage: npm run test:tl-testvideo-smart -- --query "your question" [--limit 10] [--force-reindex]');
      process.exit(1);
    }

    // Calculate file hash for cache validation
    const fileHash = calculateFileHash(videoPath);
    
    // Check cache first
    let videoId: string;
    let taskId: string;
    
    if (!forceReindex) {
      const cached = loadCache();
      if (cached && cached.fileHash === fileHash && cached.videoId && cached.taskId) {
        printHeader('Using cached video');
        console.log(`Found cached video: ${cached.videoId}`);
        console.log(`Indexed at: ${cached.indexedAt}`);
        videoId = cached.videoId;
        taskId = cached.taskId;
      } else {
        // Try to find existing video in TwelveLabs
        printHeader('Searching for existing indexed video');
        const client = new TwelveLabs({ apiKey: requireEnv('TWELVELABS_API_KEY') });
        const existing = await findExistingVideo(client, fileHash);
        
        if (existing) {
          console.log(`Found existing video: ${existing.videoId} in index ${existing.indexId}`);
          videoId = existing.videoId;
          taskId = existing.videoId; // Use videoId as taskId fallback
          
          // Update cache
          saveCache({
            videoId: existing.videoId,
            taskId: existing.videoId,
            videoPath,
            fileHash,
            indexedAt: new Date().toISOString()
          });
        } else {
          // Need to upload and index
          console.log('No existing video found, will upload and index...');
          const result = await uploadAndIndex(videoPath, fileHash);
          videoId = result.videoId;
          taskId = result.taskId;
        }
      }
    } else {
      // Force reindex
      printHeader('Force reindexing (--force-reindex specified)');
      const result = await uploadAndIndex(videoPath, fileHash);
      videoId = result.videoId;
      taskId = result.taskId;
    }

    // 4) Run semantic search scoped to this video
    printHeader('Video-scoped semantic search results');
    const retriever = new TwelveLabsRetriever();
    const hits = await retriever.searchVideo({ videoId, taskId, query, limit });
    printHits(hits);
    
  } catch (err: any) {
    console.error('Fatal error:', err?.message || err);
    process.exit(1);
  }
}

async function uploadAndIndex(videoPath: string, fileHash: string): Promise<{ videoId: string; taskId: string }> {
  const BUCKET = requireEnv('GCS_BUCKET');
  
  // 1) Upload to GCS
  printHeader('Uploading test video to GCS');
  const storage = new Storage();
  const base = path.basename(videoPath);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const objectName = `videos/test/${stamp}-${base}`;
  const contentType = 'video/mp4';

  await storage.bucket(BUCKET).upload(videoPath, {
    destination: objectName,
    contentType,
    metadata: { contentType },
    validation: false,
  });
  console.log(`Uploaded to gs://${BUCKET}/${objectName}`);

  // 2) Create a signed read URL so TwelveLabs can fetch it
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
    || taskId; // Fallback to taskId

  if (!videoId) {
    throw new Error('Could not determine videoId from TwelveLabs task details.');
  }
  console.log('Resolved videoId:', videoId);

  // Save to cache
  saveCache({
    videoId,
    taskId,
    videoPath,
    fileHash,
    indexedAt: new Date().toISOString()
  });

  return { videoId, taskId };
}

main();