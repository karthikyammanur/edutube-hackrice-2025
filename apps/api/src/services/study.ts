import { Db } from "./db.js";
import { TwelveLabsRetriever, SearchHit } from "./twelvelabs.js";
import { UnifiedStudyGenerator, UnifiedStudyMaterials } from "./unified-study-generator.js";
import type { FlashcardItem } from "../chains/flashcards-chain.js";
import type { QuizQuestion } from "../chains/quiz-chain.js";

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

// extractTopics function removed - now handled by UnifiedStudyGenerator

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
    
    console.log(`📝 [STUDY-GEN] Step 3: Building context for unified generation...`);
    const contextStart = Date.now();
    const context = buildContextFromHits(hits, maxContextChars);
    console.log(`📊 [STUDY-GEN] Context built with ${context.length} characters in ${Date.now() - contextStart}ms`);
    
    // 🚀 UNIFIED GENERATION: Replace 9+ separate API calls with 1 comprehensive call
    console.log(`🤖 [STUDY-GEN] Step 4: UNIFIED AI generation (replacing 9+ separate API calls with 1 call)...`);
    const unifiedStart = Date.now();
    
    const generator = new UnifiedStudyGenerator({
      // Use gemini-1.5-flash for optimal cost-performance balance
      modelName: 'gemini-1.5-flash',
      temperature: 0.3
    });

    let unifiedResults: UnifiedStudyMaterials;
    try {
      unifiedResults = await generator.generateAllMaterials(context, {
        summaryLength,
        summaryTone,
        topicsCount,
        flashcardsPerTopic,
        quizPerTopic
      });
      
      const unifiedTime = Date.now() - unifiedStart;
      console.log(`✅ [STUDY-GEN] UNIFIED generation completed in ${unifiedTime}ms (was 9+ separate calls)`);
      console.log(`🚀 [STUDY-GEN] API efficiency: 90%+ reduction in calls (9+ calls → 1 call)`);
      
    } catch (error: any) {
      const unifiedTime = Date.now() - unifiedStart;
      console.warn(`⚠️ [STUDY-GEN] Unified generation failed after ${unifiedTime}ms: ${error.message}`);
      console.log(`📝 [STUDY-GEN] Using comprehensive fallback system...`);
      
      // Create comprehensive fallback
      const fallbackTopics = Array.from({ length: topicsCount }, (_, i) => `Key Concept ${i + 1}`);
      const fallbackFlashcards: Record<string, FlashcardItem[]> = {};
      const fallbackQuiz: Record<string, QuizQuestion[]> = {};
      
      fallbackTopics.forEach(topic => {
        fallbackFlashcards[topic] = Array.from({ length: Math.min(flashcardsPerTopic, 3) }, (_, i) => ({
          question: `${topic} - Important Question ${i + 1}`,
          answer: `This is a key concept related to ${topic}. Due to API limitations, detailed content is not available.`,
          topic,
          difficulty: "medium" as const
        }));
        
        fallbackQuiz[topic] = Array.from({ length: Math.min(quizPerTopic, 3) }, (_, i) => ({
          type: "multiple_choice" as const,
          prompt: `Which statement best describes ${topic}? (Question ${i + 1})`,
          choices: [
            { id: 'a', text: `A key aspect of ${topic}` },
            { id: 'b', text: `An unrelated concept` },
            { id: 'c', text: `A complex theory` },
            { id: 'd', text: `A simple definition` }
          ],
          answer: 'a',
          explanation: `This is a fallback question for ${topic}. Due to API limitations, detailed questions are not available.`,
          topic,
          difficulty: "medium" as const
        }));
      });
      
      unifiedResults = {
        summary: `**Video Summary** (Comprehensive fallback)\n\nThis video contains educational content with multiple segments. The content includes lectures, discussions, and explanatory material covering various topics.\n\n**Key Learning Areas:**\n- Introduction and overview\n- Core concepts and definitions\n- Practical examples and applications\n- Important formulas and procedures\n- Visual elements and diagrams\n\n**Note:** This summary was generated using fallback methods due to temporary API limitations.`,
        topics: fallbackTopics,
        flashcardsByTopic: fallbackFlashcards,
        quizByTopic: fallbackQuiz
      };
    }

    console.log(`📊 [STUDY-GEN] Step 5: Assembling final results from unified generation...`);
    const assemblyStart = Date.now();
    
    // Extract results from unified generation
    const { summary, topics, flashcardsByTopic, quizByTopic } = await unifiedResults;

    const totalFlashcards = Object.values(flashcardsByTopic).reduce((sum, cards) => sum + cards.length, 0);
    const totalQuizQuestions = Object.values(quizByTopic).reduce((sum, questions) => sum + questions.length, 0);
    
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