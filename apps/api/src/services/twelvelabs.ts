import { BaseRetriever } from "@langchain/core/retrievers";
import { Document } from "@langchain/core/documents";
import { TwelveLabs, TwelvelabsApi } from "twelvelabs-js";

type VideoSegment = {
  embeddingScope?: string;
  embeddingOption?: string;
  startOffsetSec?: number;
  endOffsetSec?: number;
  embeddings?: number[];
};

interface TwelveLabsEmbeddingParams {
  videoUrl: string;
  modelName?: string;
  videoClipLength?: number;
  videoStartOffsetSec?: number;
  videoEndOffsetSec?: number;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required`);
  return v;
}

export interface SearchHit {
  videoId: string;
  startSec: number;
  endSec: number;
  text: string;
  confidence: number;
  embeddingScope: string;
  deepLink: string;
}

export class TwelveLabsRetriever extends BaseRetriever {
  lc_namespace = ["twelvelabs", "retrievers"];
  
  private readonly client: TwelveLabs;
  private taskId?: string;
  
  constructor() {
    super();
    const apiKey = requireEnv("TWELVELABS_API_KEY");
    this.client = new TwelveLabs({ apiKey });
  }

  async _getRelevantDocuments(query: string): Promise<Document[]> {
    // For now, return the embedded video segments as documents
    // This is a simplified approach - in a real implementation, you'd want to
    // perform semantic search using the embeddings
    if (!this.taskId) {
      throw new Error("No video embeddings available. Please upload a video first using uploadVideo().");
    }

    const videoWithEmbeddings = await this.client.embed.tasks.retrieve(this.taskId, {
      embeddingOption: ["visual-text", "audio"],
    });

    const documents: Document[] = [];
    
    if (videoWithEmbeddings.videoEmbedding?.segments) {
      videoWithEmbeddings.videoEmbedding.segments.forEach((segment, index) => {
        const content = `Video segment ${index + 1}: ${segment.embeddingScope} content from ${segment.startOffsetSec}s to ${segment.endOffsetSec}s`;
        
        documents.push(new Document({
          pageContent: content,
          metadata: {
            source: "twelvelabs",
            taskId: this.taskId,
            embeddingScope: segment.embeddingScope,
            embeddingOption: segment.embeddingOption,
            startOffsetSec: segment.startOffsetSec,
            endOffsetSec: segment.endOffsetSec,
            embeddingLength: segment.float?.length || 0,
          },
        }));
      });
    }

    return documents;
  }

  async getRelevantDocuments(query: string): Promise<Document[]> {
    return this._getRelevantDocuments(query);
  }

  async uploadVideo(params: TwelveLabsEmbeddingParams): Promise<string> {
    const {
      videoUrl,
      modelName = "Marengo-retrieval-2.7",
      videoClipLength,
      videoStartOffsetSec,
      videoEndOffsetSec,
    } = params;

    console.log(`Creating video embedding task for: ${videoUrl}`);
    
    const task = await this.client.embed.tasks.create({
      modelName,
      videoUrl,
      videoClipLength,
      videoStartOffsetSec,
      videoEndOffsetSec,
    });

    console.log(`Created video embedding task: id=${task.id}`);
    this.taskId = task.id!;

    return task.id!;
  }

  async waitForEmbedding(taskId?: string): Promise<TwelvelabsApi.embed.TasksStatusResponse> {
    const id = taskId || this.taskId;
    if (!id) {
      throw new Error("No task ID available");
    }

    console.log("Waiting for embedding to complete...");
    
    const status = await this.client.embed.tasks.waitForDone(id, {
      sleepInterval: 5,
      callback: (task: TwelvelabsApi.embed.TasksStatusResponse) => {
        console.log(`  Status=${task.status}`);
      },
    });

    console.log(`Embedding done: ${status.status}`);
    return status;
  }

  async getEmbeddings(): Promise<TwelvelabsApi.embed.TasksRetrieveResponse | null> {
    if (!this.taskId) {
      return null;
    }

    return await this.client.embed.tasks.retrieve(this.taskId, {
      embeddingOption: ["visual-text", "audio"],
    });
  }

  getTaskId(): string | undefined {
    return this.taskId;
  }

  setTaskId(taskId: string): void {
    this.taskId = taskId;
  }

  /**
   * Search for relevant video segments using semantic similarity
   * This is the killer feature for lecture search!
   */
  async searchVideo(params: {
    videoId: string;
    taskId: string;
    query: string;
    limit?: number;
  }): Promise<SearchHit[]> {
    const { videoId, taskId, query, limit = 10 } = params;

    try {
      // Get the video embeddings
      const embeddings = await this.client.embed.tasks.retrieve(taskId, {
        embeddingOption: ["visual-text", "audio"],
      });

      if (!embeddings?.videoEmbedding?.segments) {
        throw new Error("No video segments available for search");
      }

      // For now, we'll use a simple text-based matching approach
      // In a production system, you'd want to use the actual embeddings
      // and compute cosine similarity with the query embedding
      const segments = embeddings.videoEmbedding.segments;
      
      // Create search hits with confidence scores
      const hits: SearchHit[] = [];
      
      segments.forEach((segment, index) => {
        if (segment.startOffsetSec !== undefined && segment.endOffsetSec !== undefined) {
          // Simple relevance scoring based on text similarity
          // In production, this would use actual semantic similarity
          const content = `${segment.embeddingScope} content from ${segment.startOffsetSec}s to ${segment.endOffsetSec}s`;
          const confidence = this.calculateRelevanceScore(query, content);
          
          if (confidence > 0.1) { // Only include somewhat relevant results
            hits.push({
              videoId,
              startSec: segment.startOffsetSec,
              endSec: segment.endOffsetSec,
              text: this.generateSegmentDescription(segment, index),
              confidence,
              embeddingScope: segment.embeddingScope || 'unknown',
              deepLink: `/watch?v=${videoId}#t=${Math.floor(segment.startOffsetSec)}`
            });
          }
        }
      });

      // Sort by confidence (relevance) and limit results
      return hits
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, limit);

    } catch (error) {
      console.error('Error searching video:', error);
      throw new Error(`Failed to search video: ${(error as Error).message}`);
    }
  }

  /**
   * Simple text-based relevance scoring
   * TODO: Replace with proper semantic similarity using embeddings
   */
  private calculateRelevanceScore(query: string, content: string): number {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    
    // Simple keyword matching with some basic scoring
    const queryWords = queryLower.split(/\s+/);
    let score = 0;
    
    queryWords.forEach(word => {
      if (word.length > 2 && contentLower.includes(word)) {
        score += 0.3; // Base score for keyword match
        
        // Bonus for exact phrase match
        if (contentLower.includes(queryLower)) {
          score += 0.5;
        }
      }
    });
    
    // Normalize and add some base relevance for all segments
    return Math.min(0.2 + score, 1.0);
  }

  /**
   * Generate a descriptive text for a video segment
   */
  private generateSegmentDescription(segment: any, index: number): string {
    const duration = (segment.endOffsetSec - segment.startOffsetSec).toFixed(1);
    const timeRange = `${this.formatTime(segment.startOffsetSec)} - ${this.formatTime(segment.endOffsetSec)}`;
    
    if (segment.embeddingScope === 'visual-text') {
      return `Visual content (${duration}s): ${timeRange} - Slide text, diagrams, or visual elements`;
    } else if (segment.embeddingScope === 'audio') {
      return `Audio content (${duration}s): ${timeRange} - Speech, narration, or audio explanation`;
    } else {
      return `Video segment ${index + 1} (${duration}s): ${timeRange} - Mixed content`;
    }
  }

  /**
   * Format seconds to MM:SS format
   */
  private formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}
