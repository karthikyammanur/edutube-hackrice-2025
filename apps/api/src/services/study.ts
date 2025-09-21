import { Db } from "./db.js";
import { TwelveLabsRetriever, SearchHit } from "./twelvelabs.js";
import { summarize } from "../chains/summarize-chain.js";
import { generateFlashcards, FlashcardItem } from "../chains/flashcards-chain.js";
import { generateQuiz, QuizQuestion } from "../chains/quiz-chain.js";

export interface GenerateStudyMaterialsOptions {
  query?: string;
  maxHits?: number;
  maxContextChars?: number;
  summaryLength?: "short" | "medium" | "long";
  summaryTone?: string;
  topicsCount?: number;
  flashcardsPerTopic?: number;
  quizPerTopic?: number;
}

export interface StudyMaterials {
  videoId: string;
  hits: SearchHit[];
  summary: string;
  topics: string[];
  flashcardsByTopic: Record<string, FlashcardItem[]>;
  quizByTopic: Record<string, QuizQuestion[]>;
}

function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function buildContextFromHits(hits: SearchHit[], maxChars: number): string {
  const lines: string[] = [];
  for (const h of hits) {
    const start = formatTimestamp(h.startSec);
    const end = formatTimestamp(h.endSec);
    const snippet = (h.text || "").replace(/\s+/g, " ").trim();
    const line = `- [${start}–${end}] ${snippet || "(segment)"}`;
    lines.push(line);
    const content = lines.join("\n");
    if (content.length > maxChars) {
      lines.pop();
      break;
    }
  }
  return lines.join("\n");
}

function extractTopics(summary: string, maxTopics: number): string[] {
  const topics: string[] = [];
  // Prefer bolded headings
  const boldRegex = /\*\*([^*]+?)\*\*/g;
  let m: RegExpExecArray | null;
  while ((m = boldRegex.exec(summary))) {
    const t = m[1].trim();
    if (t.length > 2 && !topics.includes(t)) topics.push(t);
    if (topics.length >= maxTopics) return topics;
  }
  // Key concepts section heuristic
  const sectionMatch = summary.match(/(^|\n)\s*key\s*concepts?\s*:?[\s\S]*?(?=\n\s*\n|\n\s*[A-Z].*:?\n|$)/i);
  if (sectionMatch) {
    const block = sectionMatch[0];
    const lineRegex = /^(?:[-*•]\s+)?([A-Z][A-Za-z0-9()\-_/\s]{2,}?)(?::|\s+\u2014|\s+-|\s+–|$)/gm;
    let lm: RegExpExecArray | null;
    while ((lm = lineRegex.exec(block))) {
      const raw = (lm[1] || "").trim();
      if (!raw) continue;
      const cleaned = raw.replace(/\s+\(.*\)$/, "").trim();
      if (cleaned && !topics.includes(cleaned)) topics.push(cleaned);
      if (topics.length >= maxTopics) return topics;
    }
  }
  // Fallback: capitalized phrases
  const fallback = Array.from(new Set(
    (summary.match(/\b([A-Z][A-Za-z0-9\-_/]{3,}(?:\s+[A-Z][A-Za-z0-9\-_/]{2,}){0,3})\b/g) || []).map((s) => s.trim())
  ));
  for (const t of fallback) {
    if (!topics.includes(t)) topics.push(t);
    if (topics.length >= maxTopics) break;
  }
  return topics;
}

export class StudyService {
  static async generateAll(
    videoId: string,
    options: GenerateStudyMaterialsOptions = {}
  ): Promise<StudyMaterials> {
    const {
      query,
      maxHits = 12,
      maxContextChars = 3500,
      summaryLength = "medium",
      summaryTone = "neutral",
      topicsCount = 4,
      flashcardsPerTopic = 8,
      quizPerTopic = 8,
    } = options;

    const video = await Db.getVideo(videoId);
    if (!video) throw new Error("Video not found");
    if (!video.taskId) throw new Error("Video has no taskId; indexing incomplete");
    if (video.status !== "ready") throw new Error(`Video not ready (status=${video.status})`);

    const retriever = new TwelveLabsRetriever();

    let hits: SearchHit[] = [];
    if (query && query.trim()) {
      hits = await retriever.searchVideo({ videoId, taskId: video.taskId, query: query.trim(), limit: maxHits });
    } else {
      // Coverage queries to surface diverse segments
      const queries = [
        "overview of the lecture",
        "key concepts and definitions",
        "formulas or procedures",
        "important graphics or diagrams",
      ];
      const seen = new Set<string>();
      for (const q of queries) {
        const part = await retriever.searchVideo({ videoId, taskId: video.taskId, query: q, limit: Math.ceil(maxHits / queries.length) });
        for (const h of part) {
          const key = `${Math.round(h.startSec)}-${Math.round(h.endSec)}`;
          if (!seen.has(key)) {
            hits.push(h);
            seen.add(key);
          }
        }
      }
      // Sort by confidence desc, then start time
      hits = hits.sort((a, b) => (b.confidence || 0) - (a.confidence || 0) || a.startSec - b.startSec).slice(0, maxHits);
    }

    const context = buildContextFromHits(hits, maxContextChars);
    const summary = await summarize(context, { length: summaryLength, tone: summaryTone });

    const topics = extractTopics(summary, topicsCount);

    const flashcardsByTopic: Record<string, FlashcardItem[]> = {};
    const quizByTopic: Record<string, QuizQuestion[]> = {};
    for (const t of topics) {
      try {
        flashcardsByTopic[t] = await generateFlashcards(summary, { topic: t, count: flashcardsPerTopic });
      } catch (e) {
        flashcardsByTopic[t] = [];
      }
      try {
        quizByTopic[t] = await generateQuiz(summary, { topic: t, count: quizPerTopic });
      } catch (e) {
        quizByTopic[t] = [];
      }
    }

    return { videoId, hits, summary, topics, flashcardsByTopic, quizByTopic };
  }
}


