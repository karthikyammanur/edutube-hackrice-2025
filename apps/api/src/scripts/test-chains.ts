import { summarize } from "../chains/summarize-chain";
import { generateFlashcards, FlashcardItem } from "../chains/flashcards-chain";
import { generateQuiz, QuizQuestion } from "../chains/quiz-chain";
import fs from "node:fs";
import path from "node:path";
import { config as dotenvConfig } from "dotenv";

// Load env from outer project root, monorepo root, and local API .env
dotenvConfig({ path: path.resolve(process.cwd(), "../../../.env") });
dotenvConfig({ path: path.resolve(process.cwd(), "../../.env") });
dotenvConfig({ path: path.resolve(process.cwd(), ".env") });

interface CliArgs {
  file?: string;
  text?: string;
  length?: "short" | "medium" | "long";
  tone?: string;
  maxTopics?: number;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === "--file" && next) { args.file = next; i++; }
    else if (arg === "--text" && next) { args.text = next; i++; }
    else if (arg === "--length" && next) { args.length = next as CliArgs["length"]; i++; }
    else if (arg === "--tone" && next) { args.tone = next; i++; }
    else if (arg === "--max-topics" && next) { args.maxTopics = Number(next) || undefined; i++; }
  }
  return args;
}

function readInput(args: CliArgs): string {
  if (args.text) return args.text;
  if (args.file) {
    const p = path.resolve(process.cwd(), args.file);
    return fs.readFileSync(p, "utf8");
  }
  throw new Error("Provide --text \"...\" or --file <path> to supply the lecture index.");
}

function extractTopicsFromSummary(summary: string, maxTopics = 8): string[] {
  const topics: string[] = [];
  const sectionMatch = summary.match(/(^|\n)\s*key\s*concepts?\s*:?[\s\S]*?(?=\n\s*\n|\n\s*[A-Z].*:?\n|$)/i);
  const target = sectionMatch ? sectionMatch[0] : summary;

  const lineRegex = /^(?:[-*•]\s+)?([A-Z][A-Za-z0-9()\-_/\s]{2,}?)(?::|\s+\u2014|\s+-|\s+–|$)/gm;
  let m: RegExpExecArray | null;
  while ((m = lineRegex.exec(target))) {
    const raw = (m[1] || "").trim();
    if (!raw) continue;
    const cleaned = raw.replace(/\s+\(.*\)$/, "").trim();
    if (cleaned && !topics.includes(cleaned)) topics.push(cleaned);
    if (topics.length >= maxTopics) break;
  }

  if (topics.length === 0) {
    // fallback: try to infer topics by capturing capitalized terms (very naive)
    const fallback = Array.from(new Set(
      (summary.match(/\b([A-Z][A-Za-z0-9\-_/]{3,}(?:\s+[A-Z][A-Za-z0-9\-_/]{2,}){0,3})\b/g) || [])
        .map(s => s.trim())
    ));
    return fallback.slice(0, maxTopics);
  }
  return topics;
}

async function main() {
  const args = parseArgs(process.argv);
  const input = readInput(args);

  console.log("\n=== Summarizing Lecture Index ===\n");
  const summary = await summarize(input, {
    length: args.length || "medium",
    tone: args.tone || "neutral",
  });
  console.log(summary);

  console.log("\n=== Extracting Topics ===\n");
  const topics = extractTopicsFromSummary(summary, args.maxTopics || 8);
  console.log(JSON.stringify(topics, null, 2));

  const allFlashcards: Record<string, FlashcardItem[]> = {};
  const allQuizzes: Record<string, QuizQuestion[]> = {};

  for (const topic of topics) {
    console.log(`\n=== Generating Flashcards for: ${topic} ===\n`);
    try {
      const cards = await generateFlashcards(summary, {
        topic,
        count: 8,
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
        count: 6,
        includeExplanations: true,
      });
      allQuizzes[topic] = quiz;
      console.log(JSON.stringify(quiz, null, 2));
    } catch (err) {
      console.error("Quiz error for topic", topic, err);
    }
  }

  console.log("\n=== Done ===\n");
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});


