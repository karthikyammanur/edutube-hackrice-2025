import { GeminiService } from './gemini.js';
import { ContentValidator } from './content-validator.js';

export interface QuizQuestion {
  question: string;
  options: [string, string, string, string]; // Exactly 4 options
  correctAnswer: number; // Index 0-3
  concept: string;
  timestamp: string; // MM:SS format
}

export interface Flashcard {
  question: string;
  answer: string;
  topic?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  timestamp?: string;
  reference?: string;
}

import type { VideoSegment } from '@edutube/types';

export interface StudyMaterialsResponse {
  summary: string;
  quiz: QuizQuestion[];
  flashcards: Flashcard[];
}

export class AutomaticStudyGenerator {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService({
      model: 'gemini-1.5-flash',
      temperature: 0.3
    });
  }

  /**
   * Generate all study materials from video segments in a single Gemini API call
   */
  async generateStudyMaterials(segments: VideoSegment[], videoDuration: number): Promise<StudyMaterialsResponse> {
    console.log('🤖 [AUTO-STUDY-GEN] Starting single Gemini API call for all materials...');
    
    // Create transcript-like text from segments for content generation
    const segmentText = segments.map(segment => segment.text).join(' ');
    const totalTextLength = segmentText.length;
    
    const quizCount = Math.max(5, Math.floor(totalTextLength / 200));
    const flashcardCount = Math.max(5, Math.floor(totalTextLength / 150));
    
    console.log(`📊 [AUTO-STUDY-GEN] Scaling content: ${quizCount} quiz questions, ${flashcardCount} flashcards from ${segments.length} segments`);
    
    const prompt = this.buildGeminiPrompt(segments, videoDuration, quizCount, flashcardCount);
    
    try {
      const geminiResponse = await this.geminiService.summarize(prompt, 'Generate educational content from this video transcript in JSON format.');
      console.log('✅ [AUTO-STUDY-GEN] Gemini API call completed successfully');
      
      return this.parseGeminiResponse(geminiResponse);
    } catch (error) {
      console.error('❌ [AUTO-STUDY-GEN] Gemini API call failed:', error);
      
      // Retry once as specified in requirements
      console.log('🔄 [AUTO-STUDY-GEN] Retrying Gemini API call...');
      try {
        const retryResponse = await this.geminiService.summarize(prompt, 'Generate educational content from this video transcript in JSON format.');
        console.log('✅ [AUTO-STUDY-GEN] Gemini API retry successful');
        return this.parseGeminiResponse(retryResponse);
      } catch (retryError) {
        console.error('❌ [AUTO-STUDY-GEN] Gemini API retry also failed:', retryError);
        throw new Error(`Gemini API failed after retry: ${(retryError as Error).message}`);
      }
    }
  }

  /**
   * Build the exact Gemini prompt template for segments as specified in prompts.txt
   */
  private buildGeminiPrompt(segments: VideoSegment[], videoDuration: number, quizCount: number, flashcardCount: number): string {
    // Convert segments to formatted transcript with timestamps
    const formattedContent = segments.map(segment => {
      const startTime = this.formatTimestamp(segment.startSec);
      const endTime = this.formatTimestamp(segment.endSec);
      return `[${startTime} - ${endTime}] ${segment.text}`;
    }).join('\n\n');

    return `Generate educational content from this video content with timestamps in JSON format:

Video Duration: ${this.formatTimestamp(videoDuration)}

Content:
${formattedContent}

Return ONLY valid JSON with this exact structure:
{
  "summary": "A comprehensive summary with proper formatting and paragraph breaks",
  "quiz": [
    {
      "question": "Multiple choice question text",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 2,
      "concept": "Main topic/concept being tested",
      "timestamp": "03:45"
    }
  ],
  "flashcards": [
    {
      "question": "Question for flashcard front",
      "answer": "Answer for flashcard back"
    }
  ]
}

Requirements:
- Generate ${quizCount} quiz questions minimum
- Generate ${flashcardCount} flashcards minimum
- All quiz questions must be MCQ with exactly 4 options
- Include timestamps that correspond to video moments (use MM:SS format)
- Timestamps must be within video duration (${this.formatTimestamp(videoDuration)})
- Summary must be properly formatted for display`;
  }

  /**
   * Convert seconds to MM:SS timestamp format
   */
  private formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Parse and validate Gemini response as specified in prompts.txt
   */
  parseGeminiResponse(geminiResponse: string): StudyMaterialsResponse {
    console.log('🔍 [AUTO-STUDY-GEN] Parsing Gemini response...');
    
    try {
      // Clean up response to extract JSON
      let cleanedResponse = geminiResponse.trim();
      
      // Remove markdown code blocks if present
      if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }
      
      const parsedData = JSON.parse(cleanedResponse);
      console.log('✅ [AUTO-STUDY-GEN] JSON parsing successful');
      
      // CRITICAL: Validate content for placeholder patterns (ZERO TOLERANCE)
      const validationResult = ContentValidator.validateStudyMaterials(parsedData);
      if (!validationResult.isValid) {
        console.error('❌ [AUTO-STUDY-GEN] Content validation failed:', validationResult.errors);
        throw new Error(`Generated content contains placeholder patterns: ${validationResult.errors.join(', ')}`);
      }
      
      console.log('✅ [AUTO-STUDY-GEN] Content validation passed - no placeholder data detected');
      
      return {
        summary: this.formatSummary(parsedData.summary),
        quiz: this.validateQuizStructure(parsedData.quiz),
        flashcards: this.validateFlashcards(parsedData.flashcards)
      };
    } catch (parseError) {
      console.error('❌ [AUTO-STUDY-GEN] JSON parsing failed:', parseError);
      throw new Error(`Failed to parse Gemini response: ${(parseError as Error).message}`);
    }
  }

  /**
   * Format summary with proper paragraph breaks
   */
  private formatSummary(summary: string): string {
    if (!summary || typeof summary !== 'string') {
      throw new Error('Summary must be a non-empty string');
    }
    
    // Ensure proper formatting
    return summary.trim();
  }

  /**
   * Validate quiz structure as specified in prompts.txt
   */
  validateQuizStructure(quiz: any[]): QuizQuestion[] {
    console.log('🧪 [AUTO-STUDY-GEN] Validating quiz structure...');
    
    if (!Array.isArray(quiz)) {
      throw new Error('Quiz must be an array');
    }
    
    const validatedQuiz: QuizQuestion[] = [];
    
    for (let i = 0; i < quiz.length; i++) {
      const item = quiz[i];
      
      // Validate required fields
      if (!item.question || typeof item.question !== 'string') {
        throw new Error(`Quiz item ${i + 1}: question must be a non-empty string`);
      }
      
      if (!Array.isArray(item.options) || item.options.length !== 4) {
        throw new Error(`Quiz item ${i + 1}: options must be an array of exactly 4 strings`);
      }
      
      if (typeof item.correctAnswer !== 'number' || item.correctAnswer < 0 || item.correctAnswer > 3) {
        throw new Error(`Quiz item ${i + 1}: correctAnswer must be a number between 0-3`);
      }
      
      if (!item.concept || typeof item.concept !== 'string') {
        throw new Error(`Quiz item ${i + 1}: concept must be a non-empty string`);
      }
      
      if (!item.timestamp || typeof item.timestamp !== 'string') {
        throw new Error(`Quiz item ${i + 1}: timestamp must be a non-empty string`);
      }
      
      // Validate timestamp format (MM:SS)
      const timestampPattern = /^\d{2}:\d{2}$/;
      if (!timestampPattern.test(item.timestamp)) {
        throw new Error(`Quiz item ${i + 1}: timestamp must be in MM:SS format`);
      }
      
      // Validate all options are strings
      for (let j = 0; j < 4; j++) {
        if (typeof item.options[j] !== 'string') {
          throw new Error(`Quiz item ${i + 1}: option ${j + 1} must be a string`);
        }
      }
      
      validatedQuiz.push({
        question: item.question,
        options: [item.options[0], item.options[1], item.options[2], item.options[3]],
        correctAnswer: item.correctAnswer,
        concept: item.concept,
        timestamp: item.timestamp
      });
    }
    
    console.log(`✅ [AUTO-STUDY-GEN] Validated ${validatedQuiz.length} quiz questions`);
    return validatedQuiz;
  }

  /**
   * Validate flashcards structure as specified in prompts.txt
   */
  validateFlashcards(flashcards: any[]): Flashcard[] {
    console.log('🧪 [AUTO-STUDY-GEN] Validating flashcards structure...');
    
    if (!Array.isArray(flashcards)) {
      throw new Error('Flashcards must be an array');
    }
    
    const validatedFlashcards: Flashcard[] = [];
    
    for (let i = 0; i < flashcards.length; i++) {
      const item = flashcards[i];
      
      // Validate required fields
      if (!item.question || typeof item.question !== 'string') {
        throw new Error(`Flashcard ${i + 1}: question must be a non-empty string`);
      }
      
      if (!item.answer || typeof item.answer !== 'string') {
        throw new Error(`Flashcard ${i + 1}: answer must be a non-empty string`);
      }
      
      validatedFlashcards.push({
        question: item.question,
        answer: item.answer
      });
    }
    
    console.log(`✅ [AUTO-STUDY-GEN] Validated ${validatedFlashcards.length} flashcards`);
    return validatedFlashcards;
  }
}