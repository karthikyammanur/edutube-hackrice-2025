import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required`);
  return v;
}

export class GeminiService {
  private model?: ChatGoogleGenerativeAI;
  private readonly modelName: string;
  private readonly temperature: number;

  constructor(params?: { model?: string; temperature?: number }) {
    // Store configuration but initialize client lazily
    this.modelName = params?.model ?? 'gemini-1.5-pro';
    this.temperature = params?.temperature ?? 0.2;
  }

  private getModel(): ChatGoogleGenerativeAI {
    if (!this.model) {
      const apiKey = requireEnv('GOOGLE_API_KEY');
      this.model = new ChatGoogleGenerativeAI({
        apiKey,
        model: this.modelName,
        temperature: this.temperature,
      });
    }
    return this.model;
  }

  async summarize(context: string, instruction = 'Summarize the following content into clear, concise study notes:') {
    const res = await this.getModel().invoke([
      ["system", instruction],
      ["human", context],
    ]);
    return res?.content?.toString?.() ?? String(res);
  }

  async generateNotes(transcript: string): Promise<{
    summary: string;
    flashcards: Array<{ question: string; answer: string }>;
    quiz: Array<{ question: string; options: string[]; correct: string }>;
  }> {
    const prompt = `
You are an AI assistant that creates comprehensive study materials from lecture transcripts. 

Based on the following transcript, please generate:

1. A concise summary (2-3 paragraphs) highlighting the main concepts and key points
2. Exactly 5 flashcards in Q&A format covering important concepts
3. Exactly 5 multiple-choice quiz questions with 4 options each (A, B, C, D) and the correct answer

Please respond ONLY with valid JSON in this exact format:
{
  "summary": "Your summary here...",
  "flashcards": [
    {"question": "Question 1?", "answer": "Answer 1"},
    {"question": "Question 2?", "answer": "Answer 2"},
    {"question": "Question 3?", "answer": "Answer 3"},
    {"question": "Question 4?", "answer": "Answer 4"},
    {"question": "Question 5?", "answer": "Answer 5"}
  ],
  "quiz": [
    {"question": "Quiz question 1?", "options": ["A", "B", "C", "D"], "correct": "A"},
    {"question": "Quiz question 2?", "options": ["A", "B", "C", "D"], "correct": "B"},
    {"question": "Quiz question 3?", "options": ["A", "B", "C", "D"], "correct": "C"},
    {"question": "Quiz question 4?", "options": ["A", "B", "C", "D"], "correct": "D"},
    {"question": "Quiz question 5?", "options": ["A", "B", "C", "D"], "correct": "A"}
  ]
}

Transcript:
${transcript}
    `;

    const response = await this.getModel().invoke([
      ["system", "You are a helpful AI assistant that generates study materials. Always respond with valid JSON only."],
      ["human", prompt],
    ]);

    const content = response?.content?.toString?.() ?? String(response);
    
    try {
      // Clean up the response in case there's extra text
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate the structure
      if (!parsed.summary || !Array.isArray(parsed.flashcards) || !Array.isArray(parsed.quiz)) {
        throw new Error('Invalid response structure');
      }
      
      if (parsed.flashcards.length !== 5 || parsed.quiz.length !== 5) {
        throw new Error('Expected exactly 5 flashcards and 5 quiz questions');
      }
      
      return parsed;
    } catch (error) {
      throw new Error(`Failed to parse Gemini response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
