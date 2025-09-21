import 'dotenv/config';
import { TwelveLabs } from 'twelvelabs-js';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required`);
  return v;
}

interface Args { videoId?: string }

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const n = argv[i + 1];
    if (a === '--video-id' && n) { args.videoId = n; i++; }
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
  const { videoId } = parseArgs(process.argv);
  if (!videoId) {
    console.error('Usage: tsx src/scripts/tl-transcript.ts --video-id <VIDEO_ID>');
    process.exit(1);
  }

  const apiKey = requireEnv('TWELVELABS_API_KEY');
  const client = new TwelveLabs({ apiKey });

  const indexes = await client.indexes.list();
  if (!indexes.data || indexes.data.length === 0) throw new Error('No indexes found');
  const indexId = indexes.data[0].id!;
  console.log(`Using index: ${indexId}`);

  console.log('Requesting transcription...');
  const resp = await client.indexes.videos.retrieve(indexId, videoId, { transcription: true } as any);

  const data: any = (resp as any)?.body || (resp as any);
  const transcription = (data?.transcription?.data) || data?.transcription;

  if (!transcription) {
    console.log('No transcription found on this video/index.');
    return;
  }

  if (Array.isArray(transcription)) {
    transcription.slice(0, 50).forEach((seg: any, i: number) => {
      const start = ts(seg.start ?? 0);
      const end = ts(seg.end ?? seg.end_offset_sec ?? seg.endSec ?? 0);
      const text = seg.value ?? seg.text ?? '';
      console.log(`${i + 1}. [${start}-${end}] ${text}`);
    });
  } else {
    console.log(JSON.stringify(transcription, null, 2));
  }
}

main().catch(err => {
  console.error('Error:', err?.message || err);
  process.exit(1);
});


