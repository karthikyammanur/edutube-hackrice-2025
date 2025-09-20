import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";

export type QuestionType = "multiple_choice" | "short_answer" | "true_false";

export interface QuizChoice {
  id: string;
  text: string;
}

export interface QuizQuestion {
  type: QuestionType;
  prompt: string;
  choices?: QuizChoice[]; // required for multiple_choice
  answer: string; // id for multiple_choice, text for others
  explanation?: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  timestamp?: string;
}

export interface BuildQuizChainOptions {
  modelName?: string;
  temperature?: number;
}

export interface GenerateQuizOptions extends BuildQuizChainOptions {
  topic: string;
  count?: number;
  includeExplanations?: boolean;
  mix?: QuestionType[]; // if omitted, default mix used
}

/**
 * Builds a chain that generates quiz questions from the structured summary output of the summarization chain.
 * Requires GOOGLE_API_KEY in env.
 */
export function buildQuizChain(options: BuildQuizChainOptions = {}) {
  const { modelName = "gemini-1.5-flash", temperature = 0.5 } = options;

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      [
        "You are an expert educational content author who writes clear, fair quiz questions.",
        "Questions must be answerable strictly from the provided structured summary,",
        "focus on the requested topic, and be unambiguous."
      ].join(" ")
    ],
    [
      "human",
      [
        "From the structured summary below, generate {count} quiz questions focused on the topic: '{topic}'.",
        "If 'mix' is provided, distribute question types accordingly among multiple_choice, short_answer, and true_false.",
        "Otherwise use a reasonable mix with at least some multiple-choice questions.",
        "Guidelines:",
        "- Ensure factual correctness and clear wording.",
        "- Calibrate difficulty (easy/medium/hard).",
        "- Where helpful, attach (mm:ss) timestamp references from the summary.",
        "- For multiple_choice: include 3-5 plausible choices with exactly one correct answer (answer is the choice 'id').",
        "- If includeExplanations=true, add a brief explanation citing the summary.",
        "Output ONLY valid JSON matching the TypeScript type: QuizQuestion[] (array of objects).",
        "Do not include explanations outside JSON.",
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

export async function generateQuiz(
  summary: string,
  options: GenerateQuizOptions
): Promise<QuizQuestion[]> {
  const {
    topic,
    count = 10,
    includeExplanations = true,
    mix = ["multiple_choice", "short_answer", "true_false"],
    ...buildOptions
  } = options;

  const chain = buildQuizChain(buildOptions);
  const output = await chain.invoke({ summary, topic, count, mix, includeExplanations });

  try {
    const cleaned = output
      .replace(/```json\s*/gi, "")
      .replace(/```/g, "")
      .trim();
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    const jsonSlice = start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;
    const parsed = JSON.parse(jsonSlice);
    if (Array.isArray(parsed)) return parsed as QuizQuestion[];
    throw new Error("Model output was not an array");
  } catch (err) {
    throw new Error("Failed to parse quiz JSON: " + (err as Error).message);
  }
}


