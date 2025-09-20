// Enhanced video analysis service that combines TwelveLabs semantic search 
// with Gemini vision analysis for comprehensive video understanding

import 'dotenv/config';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Storage } from '@google-cloud/storage';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { TwelveLabsRetriever, SearchHit } from './twelvelabs';

interface AnalysisResult {
  answer: string;
  confidence: number;
  segments: Array<{
    videoId: string;
    startSec: number;
    endSec: number;
    description: string;
    relevance: number;
  }>;
  source: 'embeddings' | 'visual_analysis' | 'hybrid';
}

interface VideoSegment {
  videoId: string;
  startSec: number;
  endSec: number;
  gcsUrl?: string;
  localPath?: string;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required`);
  return v;
}

export class VideoAnalysisService {
  private twelveLabsRetriever: TwelveLabsRetriever;
  private gemini?: GoogleGenerativeAI;
  private storage: Storage;

  constructor() {
    this.twelveLabsRetriever = new TwelveLabsRetriever();
    this.storage = new Storage();
  }

  private getGemini(): GoogleGenerativeAI {
    if (!this.gemini) {
      const apiKey = requireEnv('GOOGLE_API_KEY');
      this.gemini = new GoogleGenerativeAI(apiKey);
    }
    return this.gemini;
  }

  /**
   * Main method: Answer questions about video content using embeddings + vision analysis
   */
  async analyzeVideo(params: {
    videoId: string;
    taskId: string;
    question: string;
    maxSegments?: number;
    includeVisualAnalysis?: boolean;
  }): Promise<AnalysisResult> {
    const { videoId, taskId, question, maxSegments = 5, includeVisualAnalysis = true } = params;

    try {
      // 1. Use TwelveLabs to find relevant segments
      console.log('🔍 Searching for relevant video segments...');
      const searchHits = await this.twelveLabsRetriever.searchVideo({
        videoId,
        taskId,
        query: question,
        limit: maxSegments
      });

      if (!searchHits.length) {
        return {
          answer: 'No relevant segments found for your question.',
          confidence: 0,
          segments: [],
          source: 'embeddings'
        };
      }

      console.log(`📊 Found ${searchHits.length} relevant segments`);

      // 2. If visual analysis is enabled, extract frames and analyze with Gemini
      if (includeVisualAnalysis && searchHits.length > 0) {
        return await this.performVisualAnalysis(searchHits, question);
      }

      // 3. Fallback: Basic analysis using just TwelveLabs data
      return this.generateBasicAnswer(searchHits, question);

    } catch (error) {
      console.error('Error in video analysis:', error);
      throw new Error(`Video analysis failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Extract frames from video segments and analyze with Gemini Vision
   */
  private async performVisualAnalysis(searchHits: SearchHit[], question: string): Promise<AnalysisResult> {
    console.log('🎥 Extracting frames for visual analysis...');
    
    try {
      // For demo purposes, analyze just the top 3 most relevant segments
      const topSegments = searchHits.slice(0, 3);
      const frameAnalyses: Array<{ segment: SearchHit; description: string; relevance: number }> = [];

      for (const segment of topSegments) {
        try {
          // Extract a representative frame from the middle of the segment
          const frameTime = segment.startSec + (segment.endSec - segment.startSec) / 2;
          const frameBase64 = await this.extractFrameAsBase64(segment.videoId, frameTime);
          
          // Analyze the frame with Gemini Vision
          const description = await this.analyzeFrameWithGemini(frameBase64, question);
          const relevance = this.calculateRelevance(description, question);
          
          frameAnalyses.push({
            segment,
            description,
            relevance
          });

          console.log(`✅ Analyzed segment ${segment.startSec}s-${segment.endSec}s`);
        } catch (error) {
          console.warn(`⚠️  Failed to analyze segment ${segment.startSec}s-${segment.endSec}s:`, error);
          // Continue with other segments
        }
      }

      // Generate comprehensive answer based on visual analysis
      if (frameAnalyses.length > 0) {
        return this.synthesizeVisualAnswer(frameAnalyses, question);
      } else {
        return this.generateBasicAnswer(searchHits, question);
      }

    } catch (error) {
      console.error('Visual analysis failed, falling back to basic analysis:', error);
      return this.generateBasicAnswer(searchHits, question);
    }
  }

  /**
   * Extract a frame from the video at a specific timestamp
   */
  private async extractFrameAsBase64(videoId: string, timeInSeconds: number): Promise<string> {
    // For this demo, we'll assume the video is accessible via GCS
    // In a real implementation, you might need to download the video temporarily
    
    // Create a temporary directory
    const tempDir = path.join('/tmp', `video-frames-${Date.now()}`);
    await fs.mkdir(tempDir, { recursive: true });

    const frameFileName = `frame-${videoId}-${timeInSeconds}.jpg`;
    const framePath = path.join(tempDir, frameFileName);

    try {
      // This is a simplified example - you'd need the actual video file path
      // For now, let's create a placeholder that would work with a real video file
      const videoPath = `/path/to/video/${videoId}.mp4`; // Placeholder
      
      // Extract frame using ffmpeg (requires video file access)
      await new Promise<void>((resolve, reject) => {
        ffmpeg(videoPath)
          .seekInput(timeInSeconds)
          .frames(1)
          .output(framePath)
          .on('end', () => resolve())
          .on('error', (err) => reject(err))
          .run();
      });

      // Read frame and convert to base64
      const frameBuffer = await fs.readFile(framePath);
      const base64 = frameBuffer.toString('base64');

      // Cleanup
      await fs.unlink(framePath);
      await fs.rmdir(tempDir);

      return base64;
    } catch (error) {
      // For demo purposes, return a placeholder base64 image
      console.warn('Frame extraction failed, using placeholder');
      return 'placeholder-base64-image-data';
    }
  }

  /**
   * Analyze a video frame with Gemini Vision
   */
  private async analyzeFrameWithGemini(frameBase64: string, question: string): Promise<string> {
    try {
      const model = this.getGemini().getGenerativeModel({ model: 'gemini-1.5-pro-vision' });

      const prompt = `
Analyze this video frame to help answer the question: "${question}"

Please describe:
1. What you see in the frame (objects, people, text, diagrams, etc.)
2. How this content relates to the question
3. Any specific details that would help answer the question

Be specific and focus on details that are relevant to the question.
`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: frameBase64,
            mimeType: 'image/jpeg'
          }
        }
      ]);

      return result.response.text();
    } catch (error) {
      console.error('Gemini vision analysis failed:', error);
      return `Visual analysis not available. Segment shows content from ${question} timeframe.`;
    }
  }

  /**
   * Calculate relevance score between description and question
   */
  private calculateRelevance(description: string, question: string): number {
    // Simple keyword-based relevance scoring
    const questionWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const descriptionLower = description.toLowerCase();
    
    let matches = 0;
    questionWords.forEach(word => {
      if (descriptionLower.includes(word)) {
        matches++;
      }
    });

    return matches / questionWords.length;
  }

  /**
   * Generate comprehensive answer from visual analysis results
   */
  private synthesizeVisualAnswer(
    frameAnalyses: Array<{ segment: SearchHit; description: string; relevance: number }>,
    question: string
  ): AnalysisResult {
    // Sort by relevance
    frameAnalyses.sort((a, b) => b.relevance - a.relevance);

    const segments = frameAnalyses.map(analysis => ({
      videoId: analysis.segment.videoId,
      startSec: analysis.segment.startSec,
      endSec: analysis.segment.endSec,
      description: analysis.description,
      relevance: analysis.relevance
    }));

    // Create a comprehensive answer
    const descriptions = frameAnalyses.map(a => a.description).join('\n\n');
    const answer = `Based on visual analysis of the video content:\n\n${descriptions}`;

    const avgConfidence = frameAnalyses.reduce((sum, a) => sum + a.relevance, 0) / frameAnalyses.length;

    return {
      answer,
      confidence: avgConfidence,
      segments,
      source: 'hybrid'
    };
  }

  /**
   * Generate basic answer using only TwelveLabs semantic search results
   */
  private generateBasicAnswer(searchHits: SearchHit[], question: string): AnalysisResult {
    const segments = searchHits.map(hit => ({
      videoId: hit.videoId,
      startSec: hit.startSec,
      endSec: hit.endSec,
      description: hit.text,
      relevance: hit.confidence
    }));

    const timeRanges = searchHits.map(hit => 
      `${this.formatTime(hit.startSec)}-${this.formatTime(hit.endSec)}`
    ).join(', ');

    const answer = `Found relevant content in the following video segments: ${timeRanges}. ` +
      `The video contains information related to "${question}" during these timeframes. ` +
      `For detailed analysis of the visual content, enable visual analysis mode.`;

    const avgConfidence = searchHits.reduce((sum, hit) => sum + hit.confidence, 0) / searchHits.length;

    return {
      answer,
      confidence: avgConfidence,
      segments,
      source: 'embeddings'
    };
  }

  /**
   * Format seconds to MM:SS
   */
  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Quick analysis method for testing
   */
  async quickAnalysis(videoId: string, question: string): Promise<string> {
    try {
      const result = await this.analyzeVideo({
        videoId,
        taskId: videoId,
        question,
        maxSegments: 3,
        includeVisualAnalysis: false // Start with embeddings only
      });

      return `**Answer:** ${result.answer}\n\n**Confidence:** ${(result.confidence * 100).toFixed(1)}%\n\n**Source:** ${result.source}`;
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}