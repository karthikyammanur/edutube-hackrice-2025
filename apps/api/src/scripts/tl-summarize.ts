import 'dotenv/config';
import { TwelveLabs } from 'twelvelabs-js';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required`);
  return v;
}

interface Args { videoId?: string; type?: 'summary' | 'chapter' | 'highlight'; prompt?: string }

function parseArgs(argv: string[]): Args {
  const args: Args = { type: 'summary' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const n = argv[i + 1];
    if (a === '--video-id' && n) { args.videoId = n; i++; }
    else if (a === '--type' && n) { args.type = n as Args['type']; i++; }
    else if (a === '--prompt' && n) { args.prompt = n; i++; }
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
  const { videoId, type = 'summary', prompt } = parseArgs(process.argv);
  if (!videoId) {
    console.error('Usage: tsx src/scripts/tl-summarize.ts --video-id <VIDEO_ID> [--type summary|chapter|highlight] [--prompt "..."]');
    process.exit(1);
  }

  const apiKey = requireEnv('TWELVELABS_API_KEY');
  const client = new TwelveLabs({ apiKey });

  console.log(`Summarizing video ${videoId} (type=${type})...`);
  const resp = await client.summarize({ videoId, type, prompt } as any);

  // Print based on type
  const t: string = (resp as any)?.summarizeType || type;
  if (t === 'summary') {
    console.log('\n=== Summary ===\n');
    console.log((resp as any)?.summary || '');
  } else if (t === 'chapter') {
    console.log('\n=== Chapters ===\n');
    const chapters: any[] = (resp as any)?.chapters || [];
    if (!chapters.length) {
      console.log('No chapters returned.');
    } else {
      chapters.forEach((c: any) => {
        const start = ts(c.start || c.startSec || 0);
        const end = ts(c.end || c.endSec || 0);
        console.log(`[${start}-${end}] ${c.chapterTitle || c.title || 'Chapter'} (#${c.chapterNumber || ''})`);
      });
    }
  } else if (t === 'highlight') {
    console.log('\n=== Highlights ===\n');
    const highlights: any[] = (resp as any)?.highlights || [];
    if (!highlights.length) {
      console.log('No highlights returned.');
    } else {
      highlights.forEach((h: any, i: number) => {
        console.log(`${i + 1}. ${h.highlight || h.text || ''}`);
      });
    }
  } else {
    console.log(resp);
  }
}

main().catch(err => {
  console.error('Error:', err?.message || err);
  process.exit(1);
});


