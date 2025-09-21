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
    
    // OPTIMIZATION: Batch process chapters to reduce API calls
    if (gen && chapters.length > 0) {
      try {
        // Build all chapter data first
        const chapterData = chapters.map(ch => ({
          startSec: Number(ch.start || ch.startSec || 0),
          endSec: Number(ch.end || ch.endSec || 0),
          title: String(ch.chapterTitle || ch.title || 'Chapter'),
          windowText: transcript.length ? extractWindowText(transcript, 
            Number(ch.start || ch.startSec || 0),
            Number(ch.end || ch.endSec || 0)
          ) : overall.slice(0, 1000) // Limit fallback text
        }));

        // Batch process: Generate concepts and captions for ALL chapters in single API call
        console.log(`🚀 [OUTLINE] Batching ${chapterData.length} chapters into single API call`);
        const batchStart = Date.now();
        
        const batchPrompt = `
Analyze these lecture chapters and generate concepts and captions for each.

For each chapter, provide:
1. concepts: 2-4 concise key terms/concepts
2. caption: one descriptive sentence (10-18 words)

Return JSON array with same order as input:
[
  {"concepts": ["term1", "term2"], "caption": "descriptive sentence"},
  {"concepts": ["term3", "term4"], "caption": "another descriptive sentence"}
]

Chapters:
${chapterData.map((ch, i) => 
  `Chapter ${i + 1}: ${ch.title} (${toTs(ch.startSec)}-${toTs(ch.endSec)})\n${ch.windowText.slice(0, 300)}...`
).join('\n\n')}
        `;

        const model = gen.getGenerativeModel({ model: 'gemini-1.5-flash' });
        const resp = await model.generateContent(batchPrompt);
        const raw = await resp.response.text();
        
        // Parse batched response
        const body = raw.match(/\[[\s\S]*\]/) 
          ? raw.match(/\[[\s\S]*\]/)![0]
          : raw.replace(/```json|```/g, '').trim();
        
        const batchResults = JSON.parse(body);
        console.log(`✅ [OUTLINE] Batch processing completed in ${Date.now() - batchStart}ms`);
        
        // Apply results to segments
        chapterData.forEach((ch, i) => {
          const result = batchResults[i] || { concepts: [], caption: '' };
          segments.push({
            startSec: ch.startSec,
            endSec: ch.endSec,
            title: ch.title,
            concepts: Array.isArray(result.concepts) ? result.concepts.slice(0, 4) : [],
            caption: String(result.caption || '').trim()
          });
        });

      } catch (error) {
        console.warn(`⚠️ [OUTLINE] Batch processing failed, using fallback:`, error);
        // Fallback: process without AI enhancement
        chapters.forEach(ch => {
          segments.push({
            startSec: Number(ch.start || ch.startSec || 0),
            endSec: Number(ch.end || ch.endSec || 0),
            title: String(ch.chapterTitle || ch.title || 'Chapter'),
            concepts: [],
            caption: ''
          });
        });
      }
    } else {
      // No Gemini available - basic segments without AI enhancement
      chapters.forEach(ch => {
        segments.push({
          startSec: Number(ch.start || ch.startSec || 0),
          endSec: Number(ch.end || ch.endSec || 0), 
          title: String(ch.chapterTitle || ch.title || 'Chapter'),
          concepts: [],
          caption: ''
        });
      });
    }

    let keyConcepts: string[] = [];
    if (gen && overall.trim()) {
      try { 
        keyConcepts = await extractKeyConcepts(gen, overall); 
      } catch (error) {
        console.warn(`⚠️ [OUTLINE] Key concepts extraction failed:`, error);
      }
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


