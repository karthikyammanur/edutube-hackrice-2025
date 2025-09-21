import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

export type SummarizeLength = "short" | "medium" | "long";

export interface BuildSummarizeChainOptions {
  modelName?: string;
  temperature?: number;
}

export interface SummarizeOptions extends BuildSummarizeChainOptions {
  tone?: string;
  length?: SummarizeLength;
}

/**
 * Builds a simple summarization chain using LangChain.
 *
 * Environment:
 * - GOOGLE_API_KEY must be set in the environment for the Gemini client.
 */
export function buildSummarizeChain(options: BuildSummarizeChainOptions = {}) {
  const { modelName = "gemini-1.5-flash", temperature = 0.1 } = options;

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      [
        "You are a helpful assistant that creates structured, accurate summaries of educational content.",
        "You work from video indexer outputs (lecture indexes) that include segments and timestamps,",
        "detected key concepts, graphics/diagrams, and OCR/captions."
      ].join(" ")
    ],
    [
      "human",
      [
        "The input below is a lecture video index produced by a video indexer,",
        "containing segments with timestamps, detected key concepts, captions/OCR,",
        "and mentions of graphics or diagrams.",
        "Create a structured study summary. Aim for a {length} length and use a {tone} tone.",
        "Cover: an overview, key concepts with one-sentence definitions, important graphics and what they illustrate,",
        "notable formulas or step-by-step procedures, and any cautions/misconceptions.",
        "Where helpful, reference timestamps in (mm:ss).",
        "\n\nLecture Index:\n{input}",
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

export async function summarize(
  input: string,
  options: SummarizeOptions = {}
): Promise<string> {
  const { length = "medium", tone = "neutral", ...buildOptions } = options;
  const chain = buildSummarizeChain(buildOptions);
  return chain.invoke({ input, length, tone });
}


