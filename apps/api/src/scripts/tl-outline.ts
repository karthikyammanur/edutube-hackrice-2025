import 'dotenv/config';
import { TwelveLabs } from 'twelvelabs-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

interface Args { videoId?: string; enrich?: boolean; transcript?: boolean }

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required`);
  return v;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--video-id') { args.videoId = argv[++i]; }
    else if (a === '--enrich') { args.enrich = true; }
    else if (a === '--transcript') { args.transcript = true; }
  }
  return args;
}

function ts(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

async function summarizeChapters(client: TwelveLabs, videoId: string) {
  const resp: any = await client.summarize({ videoId, type: 'chapter' } as any);
  return resp?.chapters || [];
}

async function summarizeOverall(client: TwelveLabs, videoId: string) {
  const resp: any = await client.summarize({ videoId, type: 'summary' } as any);
  return (resp?.summary || '').toString();
}

// Extract key concepts from overall summary using LLM (skip gist)
async function extractKeyConceptsFromSummary(gen: GoogleGenerativeAI, summary: string): Promise<string[]> {
  const model = gen.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `Extract 6-10 concise key concepts from the lecture summary.
Return strict JSON: { "concepts": ["..."] }.
Summary:\n${summary}`;
  const resp = await model.generateContent(prompt);
  const raw = await resp.response.text();
  const body = raw.match(/```json[\s\S]*?```|```[\s\S]*?```/)
    ? raw.replace(/^[\s\S]*?```(?:json)?|```[\s\S]*$/g, '').trim()
    : raw.trim();
  const data = JSON.parse(body);
  const arr = Array.isArray(data.concepts) ? data.concepts : [];
  return arr.map((s: any) => String(s)).filter(Boolean).slice(0, 10);
}

async function enrichChapter(gen: GoogleGenerativeAI, title: string, summaryOrWindow: string, start: string, end: string) {
  const model = gen.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `Given a lecture chapter with title and the lecture summary, produce JSON with keys concepts (2-4 concise terms) and caption (one sentence 10-18 words).
Title: ${title}\nTime: ${start}-${end}\nText: ${summaryOrWindow}`;
  const resp = await model.generateContent(prompt);
  const raw = await resp.response.text();
  const body = raw.match(/```json[\s\S]*?```|```[\s\S]*?```/)
    ? raw.replace(/^[\s\S]*?```(?:json)?|```[\s\S]*$/g, '').trim()
    : raw.trim();
  const data = JSON.parse(body);
  return { concepts: data.concepts || [], caption: data.caption || '' };
}

async function getDefaultIndexId(client: TwelveLabs): Promise<string> {
  const indexes = await client.indexes.list();
  if (!indexes.data || indexes.data.length === 0) throw new Error('No indexes found');
  return indexes.data[0].id!;
}

type TranscriptSeg = { start: number; end: number; text: string };

async function getTranscript(client: TwelveLabs, videoId: string): Promise<TranscriptSeg[]> {
  const indexId = await getDefaultIndexId(client);
  const resp: any = await client.indexes.videos.retrieve(indexId, videoId, { transcription: true } as any);
  const data: any = (resp as any)?.body || (resp as any);
  const arr = (data?.transcription?.data) || data?.transcription || [];
  if (!Array.isArray(arr)) return [];
  return arr.map((seg: any) => ({
    start: Number(seg.start ?? 0),
    end: Number(seg.end ?? seg.end_offset_sec ?? seg.endSec ?? seg.start ?? 0),
    text: String(seg.value ?? seg.text ?? '')
  }));
}

function extractWindowText(transcript: TranscriptSeg[], startSec: number, endSec: number): string {
  const within = transcript.filter(s => s.end > startSec && s.start < endSec);
  const merged = within
    .sort((a, b) => a.start - b.start)
    .map(s => s.text.trim())
    .filter(Boolean)
    .join(' ');
  return merged.slice(0, 2000); // keep prompt small
}

async function main() {
  const { videoId, enrich, transcript } = parseArgs(process.argv);
  if (!videoId) {
    console.error('Usage: tsx src/scripts/tl-outline.ts --video-id <VIDEO_ID> [--enrich] [--transcript]');
    process.exit(1);
  }

  const client = new TwelveLabs({ apiKey: requireEnv('TWELVELABS_API_KEY') });
  const chapters = await summarizeChapters(client, videoId);
  const overall = await summarizeOverall(client, videoId);
  let keyConcepts: string[] = [];

  let transcriptSegs: TranscriptSeg[] = [];
  if (enrich && transcript) {
    try {
      transcriptSegs = await getTranscript(client, videoId);
    } catch (e) {
      // continue without transcript
    }
  }

  let gen: GoogleGenerativeAI | undefined;
  if (enrich) {
    gen = new GoogleGenerativeAI(requireEnv('GOOGLE_API_KEY'));
    // Build Key Concepts from the overall summary via LLM
    try {
      keyConcepts = await extractKeyConceptsFromSummary(gen, overall);
    } catch (_) {
      keyConcepts = [];
    }
  }

  console.log(`Video: ${videoId}`);
  for (const ch of chapters) {
    const start = ts(ch.start || ch.startSec || 0);
    const end = ts(ch.end || ch.endSec || 0);
    const title = ch.chapterTitle || ch.title || 'Chapter';

    if (gen) {
      try {
        const startNum = ch.start || ch.startSec || 0;
        const endNum = ch.end || ch.endSec || 0;
        const windowText = transcript && transcriptSegs.length
          ? extractWindowText(transcriptSegs, startNum, endNum)
          : overall;
        const { concepts, caption } = await enrichChapter(gen, title, windowText, start, end);
        const conceptsStr = (concepts || []).slice(0, 4).join('; ');
        console.log(`[${start}] Segment: ${title} — concepts: ${conceptsStr}; captions: "${caption}"`);
      } catch (e: any) {
        console.log(`[${start}] Segment: ${title}`);
      }
    } else {
      console.log(`[${start}] Segment: ${title}`);
    }
  }

  if (keyConcepts.length) {
    console.log(`\nKey Concepts:`);
    keyConcepts.slice(0, 10).forEach((k: string) => {
      console.log(`- ${k}`);
    });
  }
}

main().catch(err => {
  console.error('Error:', err?.message || err);
  process.exit(1);
});


