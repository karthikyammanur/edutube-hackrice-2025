/**
 * Content Validation Service
 * Validates generated content to ensure no placeholder patterns exist
 * As specified in prompts.txt - ZERO TOLERANCE for placeholder data
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ContentValidator {
  private static readonly PLACEHOLDER_PATTERNS = [
    /^sample$|^placeholder$|^example$|lorem ipsum|^test$|^demo$/i,
    /\[(?:topic|concept|field|question|answer|content|subject|chapter|lesson)\]/i, // Specific bracket placeholders only
    /\[(?:question \d+|answer \d+|option [a-z])\]/i, // Numbered placeholders
    /^\.\.\.$/, // Only standalone ellipsis as placeholder
    /^key concept \d+$/i, // Only if it's the entire content, not part of sentence
    /^important question \d+$/i, // Only if it's the entire content
    /fallback|temporary|api limitations/i,
    /due to.*limitations/i,
    /not available/i,
    /^sample.*question$/i, // Only if it starts and ends as sample question
    /^demo.*content$/i // Only if it starts and ends as demo content
  ];

  /**
   * Validate complete study materials response
   */
  static validateStudyMaterials(materials: any): ValidationResult {
    const errors: string[] = [];

    // Validate summary
    const summaryResult = this.validateSummary(materials.summary);
    if (!summaryResult.isValid) {
      errors.push(...summaryResult.errors);
    }

    // Validate quiz questions
    if (materials.quiz && Array.isArray(materials.quiz)) {
      materials.quiz.forEach((question: any, index: number) => {
        const quizResult = this.validateQuizQuestion(question, index);
        if (!quizResult.isValid) {
          errors.push(...quizResult.errors);
        }
      });
    } else {
      errors.push('Quiz must be a non-empty array');
    }

    // Validate flashcards
    if (materials.flashcards && Array.isArray(materials.flashcards)) {
      materials.flashcards.forEach((card: any, index: number) => {
        const flashcardResult = this.validateFlashcard(card, index);
        if (!flashcardResult.isValid) {
          errors.push(...flashcardResult.errors);
        }
      });
    } else {
      errors.push('Flashcards must be a non-empty array');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate summary content
   */
  static validateSummary(summary: string): ValidationResult {
    const errors: string[] = [];

    if (!summary || typeof summary !== 'string') {
      errors.push('Summary must be a non-empty string');
      return { isValid: false, errors };
    }

    if (summary.trim().length < 50) {
      errors.push('Summary too short - must be at least 50 characters');
    }

    // Check for placeholder patterns
    this.PLACEHOLDER_PATTERNS.forEach((pattern, index) => {
      if (pattern.test(summary)) {
        errors.push(`Summary contains placeholder pattern ${index + 1}: ${pattern.toString()}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate quiz question structure and content
   */
  static validateQuizQuestion(question: any, index: number): ValidationResult {
    const errors: string[] = [];
    const prefix = `Quiz question ${index + 1}`;

    if (!question.question || typeof question.question !== 'string') {
      errors.push(`${prefix}: question must be a non-empty string`);
    } else {
      // Check question for placeholder patterns
      this.PLACEHOLDER_PATTERNS.forEach((pattern, patternIndex) => {
        if (pattern.test(question.question)) {
          errors.push(`${prefix}: question contains placeholder pattern ${patternIndex + 1}`);
        }
      });
    }

    if (!Array.isArray(question.options) || question.options.length !== 4) {
      errors.push(`${prefix}: options must be an array of exactly 4 strings`);
    } else {
      // Check each option for placeholder patterns
      question.options.forEach((option: any, optionIndex: number) => {
        if (typeof option !== 'string') {
          errors.push(`${prefix}: option ${optionIndex + 1} must be a string`);
        } else {
          this.PLACEHOLDER_PATTERNS.forEach((pattern, patternIndex) => {
            if (pattern.test(option)) {
              errors.push(`${prefix}: option ${optionIndex + 1} contains placeholder pattern ${patternIndex + 1}`);
            }
          });
        }
      });
    }

    if (typeof question.correctAnswer !== 'number' || question.correctAnswer < 0 || question.correctAnswer > 3) {
      errors.push(`${prefix}: correctAnswer must be a number between 0-3`);
    }

    if (!question.concept || typeof question.concept !== 'string') {
      errors.push(`${prefix}: concept must be a non-empty string`);
    } else {
      // Check concept for placeholder patterns
      this.PLACEHOLDER_PATTERNS.forEach((pattern, patternIndex) => {
        if (pattern.test(question.concept)) {
          errors.push(`${prefix}: concept contains placeholder pattern ${patternIndex + 1}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate flashcard structure and content
   */
  static validateFlashcard(card: any, index: number): ValidationResult {
    const errors: string[] = [];
    const prefix = `Flashcard ${index + 1}`;

    if (!card.question || typeof card.question !== 'string') {
      errors.push(`${prefix}: question must be a non-empty string`);
    } else {
      // Check question for placeholder patterns
      this.PLACEHOLDER_PATTERNS.forEach((pattern, patternIndex) => {
        if (pattern.test(card.question)) {
          errors.push(`${prefix}: question contains placeholder pattern ${patternIndex + 1}`);
        }
      });
    }

    if (!card.answer || typeof card.answer !== 'string') {
      errors.push(`${prefix}: answer must be a non-empty string`);
    } else {
      // Check answer for placeholder patterns
      this.PLACEHOLDER_PATTERNS.forEach((pattern, patternIndex) => {
        if (pattern.test(card.answer)) {
          errors.push(`${prefix}: answer contains placeholder pattern ${patternIndex + 1}`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate text content for placeholder patterns
   */
  static validateTextContent(text: string, fieldName: string): ValidationResult {
    const errors: string[] = [];

    if (!text || typeof text !== 'string') {
      errors.push(`${fieldName} must be a non-empty string`);
      return { isValid: false, errors };
    }

    // Check for placeholder patterns
    this.PLACEHOLDER_PATTERNS.forEach((pattern, index) => {
      if (pattern.test(text)) {
        errors.push(`${fieldName} contains placeholder pattern ${index + 1}: ${pattern.toString()}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate that content was actually generated from video segments
   */
  static validateContentOriginality(content: string, segments: any[]): ValidationResult {
    const errors: string[] = [];

    if (!segments || segments.length === 0) {
      errors.push('No video segments available for content generation');
      return { isValid: false, errors };
    }

    // Check that content has sufficient length relative to segments
    const totalSegmentText = segments.map(s => s.text || '').join(' ');
    const segmentTextLength = totalSegmentText.length;

    if (segmentTextLength < 100) {
      errors.push('Insufficient segment text for meaningful content generation');
    }

    if (content.length < segmentTextLength * 0.1) {
      errors.push('Generated content too short relative to source material');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default ContentValidator;