import 'dotenv/config';
import { TwelveLabs } from 'twelvelabs-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Db } from './db.js';

interface OutlineSegment {
  startSec: number;
  endSec: number;
  title: string;
  concepts: string[];
  caption: string;
}

interface OutlinePayload {
  segments: OutlineSegment[];
  keyConcepts: string[];
  generatedAt: string;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required`);
  return v;
}

function toTs(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
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
  return merged.slice(0, 2000);
}

async function llmConceptsAndCaption(gen: GoogleGenerativeAI, title: string, text: string, start: number, end: number): Promise<{ concepts: string[]; caption: string }> {
  const model = gen.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `Given a lecture chapter title and local transcript text, return JSON {"concepts": [2-4 concise terms], "caption": "one sentence 10-18 words"}.
Title: ${title}\nTime: ${toTs(start)}-${toTs(end)}\nText: ${text}`;
  const resp = await model.generateContent(prompt);
  const raw = await resp.response.text();
  const body = raw.match(/```json[\s\S]*?```|```[\s\S]*?```/)
    ? raw.replace(/^[\s\S]*?```(?:json)?|```[\s\S]*$/g, '').trim()
    : raw.trim();
  const data = JSON.parse(body);
  const concepts: string[] = Array.isArray(data.concepts) ? data.concepts.map((s: any) => String(s)).filter(Boolean).slice(0, 4) : [];
  const caption: string = String(data.caption || '').trim();
  return { concepts, caption };
}

async function extractKeyConcepts(gen: GoogleGenerativeAI, summary: string): Promise<string[]> {
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

export class OutlineService {
  static async generate(videoId: string): Promise<OutlinePayload> {
    const client = new TwelveLabs({ apiKey: requireEnv('TWELVELABS_API_KEY') });

    // Chapters + overall summary
    const chaptersResp: any = await client.summarize({ videoId, type: 'chapter' } as any);
    const chapters: any[] = chaptersResp?.chapters || [];
    const summaryResp: any = await client.summarize({ videoId, type: 'summary' } as any);
    const overall: string = (summaryResp?.summary || '').toString();

    const gen = process.env.GOOGLE_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : undefined;
    const transcript = gen ? await getTranscript(client, videoId) : [];

    const segments: OutlineSegment[] = [];
    for (const ch of chapters) {
      const startSec: number = Number(ch.start || ch.startSec || 0);
      const endSec: number = Number(ch.end || ch.endSec || startSec);
      const title: string = String(ch.chapterTitle || ch.title || 'Chapter');

      let concepts: string[] = [];
      let caption = '';
      if (gen) {
        try {
          const windowText = transcript.length ? extractWindowText(transcript, startSec, endSec) : overall;
          const out = await llmConceptsAndCaption(gen, title, windowText, startSec, endSec);
          concepts = out.concepts;
          caption = out.caption;
        } catch (_) {
          // leave empty
        }
      }

      segments.push({ startSec, endSec, title, concepts, caption });
    }

    let keyConcepts: string[] = [];
    if (gen) {
      try { keyConcepts = await extractKeyConcepts(gen, overall); } catch (_) {}
    }

    return {
      segments,
      keyConcepts,
      generatedAt: new Date().toISOString(),
    };
  }

  static async generateAndSave(videoId: string): Promise<void> {
    const outline = await OutlineService.generate(videoId);
    const meta = await Db.getVideo(videoId);
    if (!meta) return;
    const extra = { ...(meta.extra || {}), outline, outlineUpdatedAt: new Date().toISOString() } as any;
    await Db.upsertVideo({ ...meta, extra });
  }
}


