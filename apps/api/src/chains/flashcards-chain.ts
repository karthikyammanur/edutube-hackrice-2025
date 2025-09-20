import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

export interface FlashcardItem {
  question: string;
  answer: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  timestamp?: string;
  reference?: string;
}

export interface BuildFlashcardsChainOptions {
  modelName?: string;
  temperature?: number;
}

export interface GenerateFlashcardsOptions extends BuildFlashcardsChainOptions {
  topic: string;
  count?: number;
  style?: "concise" | "detailed";
}

/**
 * Builds a chain that generates flashcards from a structured study summary produced by the summarization chain.
 * Requires GOOGLE_API_KEY in env.
 */
export function buildFlashcardsChain(options: BuildFlashcardsChainOptions = {}) {
  const { modelName = "gemini-1.5-flash", temperature = 0.4 } = options;

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      [
        "You are a helpful assistant that creates high-quality flashcards from structured study summaries.",
        "Each flashcard must be unambiguous, answerable from the summary, and focused on a single idea.",
        "Prefer cloze deletions or short-answer questions for key definitions and formulas.",
      ].join(" ")
    ],
    [
      "human",
      [
        "Using the structured summary below, create {count} flashcards focused on the topic: '{topic}'.",
        "Follow these rules:",
        "- Use {style} phrasing.",
        "- Include 'topic' for each card and set difficulty roughly based on cognitive effort.",
        "- If a card is tied to a specific moment, include a (mm:ss) timestamp from the summary when possible.",
        "- Output ONLY valid JSON matching this TypeScript type: FlashcardItem[] (array of objects).",
        "- Do not include explanations outside JSON.",
        "\n\nStructured Summary:\n{summary}",
      ].join(" ")
    ]
  ]);

  const model = new ChatGoogleGenerativeAI({
    model: modelName,
    temperature,
    apiKey: process.env.GOOGLE_API_KEY,
  });

  return RunnableSequence.from([
    prompt,
    model,
    new StringOutputParser(),
  ]);
}

export async function generateFlashcards(
  summary: string,
  options: GenerateFlashcardsOptions
): Promise<FlashcardItem[]> {
  const { topic, count = 10, style = "concise", ...buildOptions } = options;
  const chain = buildFlashcardsChain(buildOptions);
  const output = await chain.invoke({ summary, topic, count, style });
  try {
    const cleaned = output
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim();
    // Try to extract the first JSON array if extra text slipped in
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    const jsonSlice = start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;
    const parsed = JSON.parse(jsonSlice);
    if (Array.isArray(parsed)) return parsed as FlashcardItem[];
    throw new Error("Model output was not an array");
  } catch (err) {
    throw new Error("Failed to parse flashcards JSON: " + (err as Error).message);
  }
}


