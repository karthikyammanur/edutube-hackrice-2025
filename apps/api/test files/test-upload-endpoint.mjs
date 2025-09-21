// End-to-end test for video upload flow:
// 1) Request signed upload URL from API
// 2) PUT a local test video to the signed URL
// 3) Notify API to trigger TwelveLabs indexing
// 4) Optionally poll status

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const VIDEO_FILE = process.env.VIDEO_FILE || path.resolve(__dirname, '../src/scripts/testvideo.mp4');
const POLL = process.env.POLL === '1';

function logHeader(title) {
  console.log(`\n=== ${title} ===`);
}

async function apiJson(pathname, method = 'GET', body) {
  const res = await fetch(`${API_BASE}${pathname}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${method} ${pathname} -> ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

async function main() {
  try {
    if (!fs.existsSync(VIDEO_FILE)) {
      throw new Error(`Test video not found at ${VIDEO_FILE}`);
    }

    const fileStat = fs.statSync(VIDEO_FILE);
    console.log(`Using video: ${VIDEO_FILE} (${(fileStat.size / (1024 * 1024)).toFixed(1)} MB)`);

    // 1) Get signed upload URL
    logHeader('Requesting signed upload URL');
    const fileName = path.basename(VIDEO_FILE);
    const contentType = 'video/mp4';
    const up = await apiJson('/videos/upload-url', 'POST', { fileName, contentType });
    console.log(up);

    // 2) PUT to GCS signed URL
    logHeader('Uploading to GCS via signed URL');
    const fileBuf = fs.readFileSync(VIDEO_FILE);
    const putRes = await fetch(up.url, { method: 'PUT', body: fileBuf, headers: { 'Content-Type': contentType } });
    if (!putRes.ok) {
      const t = await putRes.text().catch(() => '');
      throw new Error(`Signed URL PUT failed: ${putRes.status} ${putRes.statusText} ${t}`);
    }
    console.log('Upload complete');

    // 3) Notify API to trigger TL indexing
    logHeader('Triggering TwelveLabs indexing');
    const resp = await apiJson('/videos', 'POST', { id: up.videoId, title: fileName });
    console.log({ videoId: resp.id, status: resp.status });

    if (POLL) {
      logHeader('Polling status');
      const start = Date.now();
      const timeoutMs = 5 * 60 * 1000; // 5 minutes
      while (Date.now() - start < timeoutMs) {
        const st = await apiJson(`/videos/${up.videoId}/status`, 'GET');
        console.log(new Date().toISOString(), st.status, st.segmentCount || st.totalSegments || 0);
        if (st.status === 'ready') break;
        await new Promise((r) => setTimeout(r, 5000));
      }
    }

    console.log('\n✅ Upload flow test completed');
  } catch (err) {
    console.error('\n❌ Upload flow test failed:', err?.message || err);
    process.exit(1);
  }
}

main();


