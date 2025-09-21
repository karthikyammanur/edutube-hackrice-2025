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
    const lineRegex = /^(?:[-*•]\s+)?([A-Z][A-Za-z0-9()\-_/\s]{2,}?)(?::|\s+—|\s+-|\s+–|$)/gm;
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
    const startTime = Date.now();
    console.log(`🚀 [STUDY-GEN] Starting study materials generation for video: ${videoId}`);
    console.log(`📋 [STUDY-GEN] Options:`, JSON.stringify(options, null, 2));
    
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

    console.log(`📊 [STUDY-GEN] Step 1: Looking up video metadata...`);
    const videoLookupStart = Date.now();
    const video = await Db.getVideo(videoId);
    console.log(`✅ [STUDY-GEN] Video lookup completed in ${Date.now() - videoLookupStart}ms`);
    
    if (!video) throw new Error("Video not found");
    if (!video.taskId) throw new Error("Video has no taskId; indexing incomplete");
    if (video.status !== "ready") throw new Error(`Video not ready (status=${video.status})`);
    
    console.log(`📹 [STUDY-GEN] Video found - Title: ${video.title || 'Untitled'}, Status: ${video.status}, TaskID: ${video.taskId}`);

    const retriever = new TwelveLabsRetriever();

    console.log(`🔍 [STUDY-GEN] Step 2: Starting TwelveLabs video search...`);
    const searchStart = Date.now();
    
    let hits: SearchHit[] = [];
    if (query && query.trim()) {
      console.log(`🎯 [STUDY-GEN] Using specific query: "${query.trim()}"`);
      hits = await retriever.searchVideo({ videoId, taskId: video.taskId!, query: query.trim(), limit: maxHits });
      console.log(`✅ [STUDY-GEN] Specific search completed in ${Date.now() - searchStart}ms, found ${hits.length} hits`);
    } else {
      // Coverage queries to surface diverse segments - PARALLEL EXECUTION
      console.log(`🔄 [STUDY-GEN] Using coverage queries for comprehensive analysis`);
      const queries = [
        "overview of the lecture",
        "key concepts and definitions",
        "formulas or procedures", 
        "important graphics or diagrams",
      ];
      
      console.log(`⚡ [STUDY-GEN] Starting ${queries.length} parallel search queries...`);
      const parallelSearchStart = Date.now();
      
      // Execute all search queries in parallel for speed
      const searchPromises = queries.map((q, index) => 
        retriever.searchVideo({ 
          videoId, 
          taskId: video.taskId!, 
          query: q, 
          limit: Math.ceil(maxHits / queries.length) 
        }).then(results => {
          console.log(`✅ [STUDY-GEN] Query ${index + 1}/4 "${q}" completed with ${results.length} results`);
          return results;
        }).catch(err => {
          console.warn(`❌ [STUDY-GEN] Query ${index + 1}/4 "${q}" failed:`, err.message);
          return [];
        })
      );
      
      const results = await Promise.all(searchPromises);
      console.log(`✅ [STUDY-GEN] All parallel searches completed in ${Date.now() - parallelSearchStart}ms`);
      
      const seen = new Set<string>();
      
      for (const part of results) {
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

    console.log(`✅ [STUDY-GEN] Total search completed in ${Date.now() - searchStart}ms with ${hits.length} total hits`);
    
    console.log(`📝 [STUDY-GEN] Step 3: Building context and generating summary...`);
    const contextStart = Date.now();
    const context = buildContextFromHits(hits, maxContextChars);
    console.log(`📊 [STUDY-GEN] Context built with ${context.length} characters in ${Date.now() - contextStart}ms`);
    
    const summaryStart = Date.now();
    const summary = await summarize(context, { length: summaryLength, tone: summaryTone });
    console.log(`✅ [STUDY-GEN] Summary generated in ${Date.now() - summaryStart}ms (${summary.length} characters)`);

    const topicsStart = Date.now();
    const topics = extractTopics(summary, topicsCount);
    console.log(`🏷️ [STUDY-GEN] Topics extracted in ${Date.now() - topicsStart}ms: [${topics.join(', ')}]`);

    // PARALLEL PROCESSING for AI chains
    console.log(`🤖 [STUDY-GEN] Step 4: Starting parallel AI chain processing for ${topics.length} topics...`);
    const aiChainsStart = Date.now();
    
    console.log(`📚 [STUDY-GEN] Starting flashcard generation for all topics...`);
    const flashcardPromises = topics.map(async (topic, index) => {
      const topicStart = Date.now();
      try {
        const cards = await generateFlashcards(summary, { topic, count: flashcardsPerTopic });
        console.log(`✅ [STUDY-GEN] Flashcards for "${topic}" completed in ${Date.now() - topicStart}ms (${cards.length} cards)`);
        return { topic, cards };
      } catch (e) {
        console.warn(`❌ [STUDY-GEN] Flashcard generation failed for topic "${topic}" after ${Date.now() - topicStart}ms:`, e);
        return { topic, cards: [] };
      }
    });

    console.log(`❓ [STUDY-GEN] Starting quiz generation for all topics...`);
    const quizPromises = topics.map(async (topic, index) => {
      const topicStart = Date.now();
      try {
        const questions = await generateQuiz(summary, { topic, count: quizPerTopic });
        console.log(`✅ [STUDY-GEN] Quiz for "${topic}" completed in ${Date.now() - topicStart}ms (${questions.length} questions)`);
        return { topic, questions };
      } catch (e) {
        console.warn(`❌ [STUDY-GEN] Quiz generation failed for topic "${topic}" after ${Date.now() - topicStart}ms:`, e);
        return { topic, questions: [] };
      }
    });

    // Execute all AI chains in parallel
    console.log(`⚡ [STUDY-GEN] Executing ${flashcardPromises.length + quizPromises.length} AI operations in parallel...`);
    const parallelAIStart = Date.now();
    const [flashcardResults, quizResults] = await Promise.all([
      Promise.all(flashcardPromises),
      Promise.all(quizPromises)
    ]);
    console.log(`✅ [STUDY-GEN] All AI chains completed in ${Date.now() - parallelAIStart}ms`);

    console.log(`📊 [STUDY-GEN] Step 5: Assembling final results...`);
    const assemblyStart = Date.now();
    
    const flashcardsByTopic: Record<string, FlashcardItem[]> = {};
    const quizByTopic: Record<string, QuizQuestion[]> = {};

    let totalFlashcards = 0;
    flashcardResults.forEach(({ topic, cards }) => {
      flashcardsByTopic[topic] = cards;
      totalFlashcards += cards.length;
    });

    let totalQuizQuestions = 0;
    quizResults.forEach(({ topic, questions }) => {
      quizByTopic[topic] = questions;
      totalQuizQuestions += questions.length;
    });
    
    const totalTime = Date.now() - startTime;
    console.log(`🎉 [STUDY-GEN] GENERATION COMPLETE! Total time: ${totalTime}ms`);
    console.log(`📈 [STUDY-GEN] Results summary:`);
    console.log(`   - Video hits: ${hits.length}`);
    console.log(`   - Summary length: ${summary.length} chars`);
    console.log(`   - Topics extracted: ${topics.length}`);
    console.log(`   - Flashcards generated: ${totalFlashcards}`);
    console.log(`   - Quiz questions generated: ${totalQuizQuestions}`);
    console.log(`   - Assembly time: ${Date.now() - assemblyStart}ms`);
    console.log(`⚡ [STUDY-GEN] Performance: ${Math.round(1000 / totalTime * 60)} materials/minute`);

    return { videoId, hits, summary, topics, flashcardsByTopic, quizByTopic };
  }
}