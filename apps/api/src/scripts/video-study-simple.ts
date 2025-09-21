// Simple video study materials generation using TwelveLabs + chains directly
import 'dotenv/config';
import { TwelveLabsRetriever, SearchHit } from '../services/twelvelabs.js';
import { summarize } from "../chains/summarize-chain.js";
import { generateFlashcards, FlashcardItem } from "../chains/flashcards-chain.js";
import { generateQuiz, QuizQuestion } from "../chains/quiz-chain.js";

interface Args {
  videoId?: string;
  taskId?: string;
  query?: string;
  length?: "short" | "medium" | "long";
  tone?: string;
  maxTopics?: number;
}

function parseArgs(argv: string[]): Args {
  const args: Args = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--video-id" && next) { args.videoId = next; i++; }
    else if (arg === "--task-id" && next) { args.taskId = next; i++; }
    else if (arg === "--query" && next) { args.query = next; i++; }
    else if (arg === "--length" && next) { args.length = next as Args["length"]; i++; }
    else if (arg === "--tone" && next) { args.tone = next; i++; }
    else if (arg === "--max-topics" && next) { args.maxTopics = Number(next) || undefined; i++; }
  }
  return args;
}

function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}`;
}

function buildContextFromHits(hits: SearchHit[]): string {
  const lines: string[] = [];
  for (const h of hits) {
    const start = formatTimestamp(h.startSec);
    const end = formatTimestamp(h.endSec);
    const snippet = (h.text || "").replace(/\s+/g, " ").trim();
    const line = `- [${start}–${end}] ${snippet || "(visual segment)"}`;
    lines.push(line);
  }
  return lines.join("\n");
}

function extractTopics(summary: string, maxTopics: number): string[] {
  const topics: string[] = [];
  
  // Look for key concepts section
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
  if (topics.length === 0) {
    const fallback = Array.from(new Set(
      (summary.match(/\b([A-Z][A-Za-z0-9\-_/]{3,}(?:\s+[A-Z][A-Za-z0-9\-_/]{2,}){0,3})\b/g) || []).map((s) => s.trim())
    ));
    for (const t of fallback.slice(0, maxTopics)) {
      if (!topics.includes(t)) topics.push(t);
    }
  }
  
  return topics.slice(0, maxTopics);
}

async function main() {
  const args = parseArgs(process.argv);
  
  const videoId = args.videoId || "68cf210fe23608ddb86eb6bf"; // Default to our test video
  const taskId = args.taskId || videoId; // Fallback to videoId
  const query = args.query || 'content';

  console.log(`\n=== Generating Study Materials from Video ===`);
  console.log(`🎥 Video ID: ${videoId}`);
  console.log(`🔍 Query: "${query}"`);
  console.log(`📝 Length: ${args.length || 'medium'}`);
  console.log(`🎭 Tone: ${args.tone || 'neutral'}\n`);

  try {
    const retriever = new TwelveLabsRetriever();
    
    // 1. Search for video segments
    console.log(`=== Searching Video Segments ===\n`);
    const hits = await retriever.searchVideo({ 
      videoId, 
      taskId, 
      query, 
      limit: 10 
    });
    
    if (hits.length === 0) {
      console.log('❌ No video segments found. Try a different query or check if video is properly indexed.');
      return;
    }
    
    console.log(`Found ${hits.length} segments:`);
    hits.forEach((hit, i) => {
      const start = formatTimestamp(hit.startSec);
      const end = formatTimestamp(hit.endSec);
      console.log(`${i + 1}. [${start}-${end}] ${hit.text || 'Visual segment'} (conf: ${hit.confidence.toFixed(2)})`);
    });

    // 2. Build context and generate summary
    console.log(`\n=== Generating Summary ===\n`);
    const context = buildContextFromHits(hits);
    const summary = await summarize(context, {
      length: args.length || "medium",
      tone: args.tone || "neutral",
    });
    console.log(summary);

    // 3. Extract topics
    console.log(`\n=== Extracting Topics ===\n`);
    const topics = extractTopics(summary, args.maxTopics || 5);
    console.log(JSON.stringify(topics, null, 2));

    // 4. Generate flashcards and quizzes for each topic
    const allFlashcards: Record<string, FlashcardItem[]> = {};
    const allQuizzes: Record<string, QuizQuestion[]> = {};

    for (const topic of topics) {
      console.log(`\n=== Generating Flashcards for: ${topic} ===\n`);
      try {
        const cards = await generateFlashcards(summary, {
          topic,
          count: 6,
          style: "concise",
        });
        allFlashcards[topic] = cards;
        console.log(JSON.stringify(cards, null, 2));
      } catch (err) {
        console.error("Flashcards error for topic", topic, err);
      }

      console.log(`\n=== Generating Quiz for: ${topic} ===\n`);
      try {
        const quiz = await generateQuiz(summary, {
          topic,
          count: 4,
          includeExplanations: true,
        });
        allQuizzes[topic] = quiz;
        console.log(JSON.stringify(quiz, null, 2));
      } catch (err) {
        console.error("Quiz error for topic", topic, err);
      }
    }

    console.log(`\n=== Study Materials Generated Successfully ===`);
    console.log(`📊 Stats:`);
    console.log(`   - ${hits.length} video segments analyzed`);
    console.log(`   - ${topics.length} topics extracted`);
    console.log(`   - ${Object.values(allFlashcards).flat().length} total flashcards`);
    console.log(`   - ${Object.values(allQuizzes).flat().length} total quiz questions`);

  } catch (error: any) {
    console.error('❌ Error generating study materials:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

main();
