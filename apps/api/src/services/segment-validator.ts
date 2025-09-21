import type { VideoSegment } from '@edutube/types';

export interface SegmentValidationResult {
  isValid: boolean;
  originalStart: number;
  originalEnd: number;
  validatedStart: number;
  validatedEnd: number;
  errors: string[];
}

export class SegmentValidator {
  /**
   * Validate and clamp segment timestamps as per prompts.txt requirements
   */
  static validateSegment(
    startSec: number,
    endSec: number,
    videoDuration?: number,
    minSegmentLength: number = 1
  ): SegmentValidationResult {
    const result: SegmentValidationResult = {
      isValid: true,
      originalStart: startSec,
      originalEnd: endSec,
      validatedStart: startSec,
      validatedEnd: endSec,
      errors: []
    };

    // Clamp start to non-negative
    if (startSec < 0) {
      result.validatedStart = 0;
      result.errors.push(`Start time ${startSec} clamped to 0`);
    }

    // Clamp to video duration if available
    if (videoDuration !== undefined && videoDuration > 0) {
      if (result.validatedStart > videoDuration) {
        result.validatedStart = videoDuration;
        result.errors.push(`Start time ${startSec} clamped to video duration ${videoDuration}`);
      }
      
      if (endSec > videoDuration) {
        result.validatedEnd = videoDuration;
        result.errors.push(`End time ${endSec} clamped to video duration ${videoDuration}`);
      }
    }

    // Ensure end is after start with minimum segment length
    if (result.validatedEnd <= result.validatedStart) {
      result.validatedEnd = result.validatedStart + minSegmentLength;
      result.errors.push(`End time adjusted to maintain minimum segment length of ${minSegmentLength}s`);
      
      // If this pushes us over video duration, adjust start instead
      if (videoDuration !== undefined && result.validatedEnd > videoDuration) {
        result.validatedEnd = videoDuration;
        result.validatedStart = Math.max(0, result.validatedEnd - minSegmentLength);
        result.errors.push(`Segment adjusted to fit within video duration`);
      }
    }

    // Final validation
    if (result.validatedStart >= result.validatedEnd) {
      result.isValid = false;
      result.errors.push('Segment is invalid: start >= end after validation');
    }

    if (videoDuration !== undefined && result.validatedStart >= videoDuration) {
      result.isValid = false;
      result.errors.push('Segment is invalid: start >= video duration');
    }

    return result;
  }

  /**
   * Validate and clamp multiple segments
   */
  static validateSegments(
    segments: Array<{ startSec: number; endSec: number }>,
    videoDuration?: number
  ): Array<SegmentValidationResult> {
    return segments.map(seg => this.validateSegment(seg.startSec, seg.endSec, videoDuration));
  }

  /**
   * Filter valid segments from validation results
   */
  static getValidSegments<T extends { startSec: number; endSec: number }>(
    segments: T[],
    videoDuration?: number
  ): T[] {
    const validationResults = this.validateSegments(segments, videoDuration);
    
    return segments
      .map((segment, index) => {
        const validation = validationResults[index];
        if (!validation.isValid) return null;
        
        return {
          ...segment,
          startSec: validation.validatedStart,
          endSec: validation.validatedEnd
        };
      })
      .filter((segment): segment is T => segment !== null);
  }

  /**
   * Check if timestamp is within video bounds
   */
  static isTimestampValid(timestamp: number, videoDuration?: number): boolean {
    if (timestamp < 0) return false;
    if (videoDuration !== undefined && timestamp > videoDuration) return false;
    return true;
  }

  /**
   * Clamp timestamp to video bounds
   */
  static clampTimestamp(timestamp: number, videoDuration?: number): number {
    let clamped = Math.max(0, timestamp);
    if (videoDuration !== undefined && videoDuration > 0) {
      clamped = Math.min(clamped, videoDuration);
    }
    return clamped;
  }

  /**
   * Convert MM:SS format to seconds with validation
   */
  static parseTimestamp(mmss: string, videoDuration?: number): number | null {
    const match = mmss.match(/^(\d{2}):(\d{2})$/);
    if (!match) return null;
    
    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    
    if (seconds >= 60) return null;
    
    const totalSeconds = minutes * 60 + seconds;
    
    // Validate against video duration if provided
    if (videoDuration !== undefined && totalSeconds > videoDuration) {
      return null;
    }
    
    return totalSeconds;
  }

  /**
   * Convert seconds to MM:SS format
   */
  static formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}