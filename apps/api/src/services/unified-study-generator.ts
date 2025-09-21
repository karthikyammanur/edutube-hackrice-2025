import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { FlashcardItem } from '../chains/flashcards-chain.js';
import type { QuizQuestion } from '../chains/quiz-chain.js';

export interface UnifiedStudyMaterials {
  summary: string;
  topics: string[];
  flashcardsByTopic: Record<string, FlashcardItem[]>;
  quizByTopic: Record<string, QuizQuestion[]>;
  totalTokensUsed?: number;
}

export interface UnifiedGenerationOptions {
  summaryLength?: "short" | "medium" | "long";
  summaryTone?: string;
  topicsCount?: number;
  flashcardsPerTopic?: number;
  quizPerTopic?: number;
  modelName?: string;
  temperature?: number;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required`);
  return v;
}

/**
 * UNIFIED Study Materials Generator
 * 
 * This service replaces 9+ separate Gemini API calls with a SINGLE comprehensive call
 * that generates all study materials (summary, flashcards, quizzes) at once.
 * 
 * Benefits:
 * - 90%+ reduction in API calls (9+ calls → 1 call)
 * - Faster generation (no network overhead between calls)
 * - Better consistency (all materials from same context)
 * - Lower quota usage
 * - Same high-quality output
 */
export class UnifiedStudyGenerator {
  private model?: ChatGoogleGenerativeAI;
  private readonly modelName: string;
  private readonly temperature: number;

  constructor(options: { modelName?: string; temperature?: number } = {}) {
    // Use gemini-1.5-flash for optimal cost-performance balance
    this.modelName = options.modelName ?? 'gemini-1.5-flash';
    this.temperature = options.temperature ?? 0.3;
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

  /**
   * Generate ALL study materials in a single API call
   */
  async generateAllMaterials(
    context: string,
    options: UnifiedGenerationOptions = {}
  ): Promise<UnifiedStudyMaterials> {
    const {
      summaryLength = "medium",
      summaryTone = "neutral",
      topicsCount = 4,
      flashcardsPerTopic = 8,
      quizPerTopic = 8
    } = options;

    const prompt = this.buildUnifiedPrompt({
      context,
      summaryLength,
      summaryTone,
      topicsCount,
      flashcardsPerTopic,
      quizPerTopic
    });

    console.log(`🤖 [UNIFIED] Making SINGLE Gemini API call for all study materials...`);
    const startTime = Date.now();

    try {
      const response = await this.getModel().invoke([
        ["system", "You are an expert educational AI that creates comprehensive study materials. Always respond with valid JSON only."],
        ["human", prompt]
      ]);

      const endTime = Date.now();
      const content = response?.content?.toString?.() ?? String(response);
      
      console.log(`✅ [UNIFIED] Single API call completed in ${endTime - startTime}ms`);
      console.log(`📊 [UNIFIED] Response length: ${content.length} characters`);

      return this.parseResponse(content, topicsCount, flashcardsPerTopic, quizPerTopic);

    } catch (error: any) {
      console.error(`❌ [UNIFIED] API call failed after ${Date.now() - startTime}ms:`, error.message);
      
      // Provide comprehensive fallback that matches expected structure
      console.log(`📝 [UNIFIED] Using comprehensive fallback materials`);
      return this.generateFallbackMaterials(topicsCount, flashcardsPerTopic, quizPerTopic);
    }
  }

  private buildUnifiedPrompt(params: {
    context: string;
    summaryLength: string;
    summaryTone: string;
    topicsCount: number;
    flashcardsPerTopic: number;
    quizPerTopic: number;
  }): string {
    const { context, summaryLength, summaryTone, topicsCount, flashcardsPerTopic, quizPerTopic } = params;

    return `
You are an expert educational AI that creates comprehensive study materials from lecture content.

From the lecture content below, generate ALL of the following in a SINGLE response:

1. **Summary**: A ${summaryLength} summary (2-4 paragraphs) with a ${summaryTone} tone, highlighting main concepts and key points

2. **Topics**: Extract exactly ${topicsCount} key topics/concepts from the content

3. **Flashcards**: For EACH topic, create exactly ${flashcardsPerTopic} flashcards covering important concepts, definitions, and facts

4. **Quiz Questions**: For EACH topic, create exactly ${quizPerTopic} multiple-choice quiz questions with 4 options (A,B,C,D) and correct answers

**CRITICAL REQUIREMENTS:**
- Respond ONLY with valid JSON in the EXACT format below
- Ensure all arrays have the specified number of items
- Make questions answerable from the provided content
- Include timestamps when relevant (format: mm:ss)

**REQUIRED JSON FORMAT:**
{
  "summary": "Your comprehensive summary here...",
  "topics": ["Topic 1", "Topic 2", "Topic 3", "Topic 4"],
  "flashcards": [
    {
      "question": "What is [concept]?",
      "answer": "Detailed answer with explanation",
      "topic": "Topic 1",
      "difficulty": "easy|medium|hard",
      "timestamp": "12:34"
    }
  ],
  "quiz": [
    {
      "type": "multiple_choice",
      "prompt": "Which statement about [topic] is correct?",
      "choices": [
        {"id": "a", "text": "First option"},
        {"id": "b", "text": "Second option"},
        {"id": "c", "text": "Third option"},
        {"id": "d", "text": "Fourth option"}
      ],
      "answer": "a",
      "explanation": "Brief explanation of why this is correct",
      "topic": "Topic 1",
      "difficulty": "medium",
      "timestamp": "15:42"
    }
  ]
}

**LECTURE CONTENT:**
${context}

Generate exactly ${topicsCount * flashcardsPerTopic} flashcards total (${flashcardsPerTopic} per topic) and ${topicsCount * quizPerTopic} quiz questions total (${quizPerTopic} per topic).
`;
  }

  private parseResponse(
    content: string, 
    expectedTopics: number,
    expectedFlashcardsPerTopic: number,
    expectedQuizPerTopic: number
  ): UnifiedStudyMaterials {
    try {
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!parsed.summary || !Array.isArray(parsed.topics) || 
          !Array.isArray(parsed.flashcards) || !Array.isArray(parsed.quiz)) {
        throw new Error('Invalid response structure');
      }

      // Organize flashcards by topic
      const flashcardsByTopic: Record<string, FlashcardItem[]> = {};
      const quizByTopic: Record<string, QuizQuestion[]> = {};

      // Initialize empty arrays for all topics
      parsed.topics.forEach((topic: string) => {
        flashcardsByTopic[topic] = [];
        quizByTopic[topic] = [];
      });

      // Distribute flashcards by topic
      parsed.flashcards.forEach((card: any) => {
        const flashcard: FlashcardItem = {
          question: card.question || 'Question not available',
          answer: card.answer || 'Answer not available', 
          topic: card.topic || parsed.topics[0] || 'General',
          difficulty: card.difficulty || 'medium',
          timestamp: card.timestamp,
          reference: card.reference
        };

        const topic = flashcard.topic;
        if (flashcardsByTopic[topic]) {
          flashcardsByTopic[topic].push(flashcard);
        } else {
          // If topic not found, add to first topic
          const firstTopic = Object.keys(flashcardsByTopic)[0];
          if (firstTopic) flashcardsByTopic[firstTopic].push(flashcard);
        }
      });

      // Distribute quiz questions by topic  
      parsed.quiz.forEach((q: any) => {
        const quiz: QuizQuestion = {
          type: q.type || 'multiple_choice',
          prompt: q.prompt || 'Question not available',
          choices: q.choices || [
            {id: 'a', text: 'Option A'},
            {id: 'b', text: 'Option B'}, 
            {id: 'c', text: 'Option C'},
            {id: 'd', text: 'Option D'}
          ],
          answer: q.answer || 'a',
          explanation: q.explanation,
          topic: q.topic || parsed.topics[0] || 'General',
          difficulty: q.difficulty || 'medium',
          timestamp: q.timestamp
        };

        const topic = quiz.topic;
        if (quizByTopic[topic]) {
          quizByTopic[topic].push(quiz);
        } else {
          // If topic not found, add to first topic
          const firstTopic = Object.keys(quizByTopic)[0];
          if (firstTopic) quizByTopic[firstTopic].push(quiz);
        }
      });

      const totalFlashcards = Object.values(flashcardsByTopic).reduce((sum, cards) => sum + cards.length, 0);
      const totalQuiz = Object.values(quizByTopic).reduce((sum, questions) => sum + questions.length, 0);

      console.log(`✅ [UNIFIED] Parsed materials: ${parsed.topics.length} topics, ${totalFlashcards} flashcards, ${totalQuiz} quiz questions`);

      return {
        summary: parsed.summary,
        topics: parsed.topics,
        flashcardsByTopic,
        quizByTopic
      };

    } catch (error: any) {
      console.error(`❌ [UNIFIED] Failed to parse response:`, error.message);
      console.log(`📝 [UNIFIED] Using fallback parsing...`);
      return this.generateFallbackMaterials(expectedTopics, expectedFlashcardsPerTopic, expectedQuizPerTopic);
    }
  }

  private generateFallbackMaterials(
    topicsCount: number,
    flashcardsPerTopic: number,
    quizPerTopic: number
  ): UnifiedStudyMaterials {
    const topics = Array.from({ length: topicsCount }, (_, i) => `Key Concept ${i + 1}`);
    
    const flashcardsByTopic: Record<string, FlashcardItem[]> = {};
    const quizByTopic: Record<string, QuizQuestion[]> = {};

    topics.forEach((topic, topicIndex) => {
      // Generate fallback flashcards
      flashcardsByTopic[topic] = Array.from({ length: Math.min(flashcardsPerTopic, 3) }, (_, i) => ({
        question: `What is important about ${topic}? (Card ${i + 1})`,
        answer: `This is a key concept related to ${topic}. Due to API limitations, detailed content is not available. Please try again later for AI-generated content.`,
        topic,
        difficulty: "medium" as const
      }));

      // Generate fallback quiz questions
      quizByTopic[topic] = Array.from({ length: Math.min(quizPerTopic, 3) }, (_, i) => ({
        type: "multiple_choice" as const,
        prompt: `Which statement best describes ${topic}? (Question ${i + 1})`,
        choices: [
          { id: 'a', text: `A key aspect of ${topic}` },
          { id: 'b', text: `An unrelated concept` },
          { id: 'c', text: `A complex theory` },
          { id: 'd', text: `A simple definition` }
        ],
        answer: 'a',
        explanation: `This is a fallback quiz question for ${topic}. Due to API limitations, detailed questions are not available.`,
        topic,
        difficulty: "medium" as const
      }));
    });

    return {
      summary: `**Study Materials Summary** (Auto-generated fallback)\n\nThis content contains educational material covering ${topicsCount} main topics: ${topics.join(', ')}. Due to API limitations, this is a simplified summary. For detailed AI-generated content, please try again later.\n\n**Key Learning Areas:**\n${topics.map(t => `- ${t}: Important concepts and applications`).join('\n')}`,
      topics,
      flashcardsByTopic,
      quizByTopic
    };
  }
}