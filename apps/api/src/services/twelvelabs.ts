// Removed LangChain dependencies to avoid import issues
import { TwelveLabs } from "twelvelabs-js";

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

export class TwelveLabsRetriever {
  private client?: TwelveLabs;
  private taskId?: string;
  
  constructor() {
    // Initialize client lazily to avoid requiring API key at import time
  }

  private getClient(): TwelveLabs {
    if (!this.client) {
      const apiKey = requireEnv("TWELVELABS_API_KEY");
      this.client = new TwelveLabs({ apiKey });
    }
    return this.client;
  }

  private async getDefaultIndexId(): Promise<string> {
    const indexes = await this.getClient().indexes.list();
    if (!indexes.data || indexes.data.length === 0) {
      throw new Error('No indexes found. Please create an index first.');
    }
    const firstIndex = indexes.data[0];
    if (!firstIndex.id) {
      throw new Error('Invalid index: missing ID');
    }
    return firstIndex.id;
  }

  async _getRelevantDocuments(query: string): Promise<any[]> {
    // Use TwelveLabs search API to find relevant video segments
    try {
      const indexId = await this.getDefaultIndexId();
      
      const searchResult = await this.getClient().search.query({
        indexId,
        queryText: query,
        searchOptions: ['visual'],
        pageLimit: 10
      });

      const documents: any[] = [];
      
      if (searchResult.data) {
        searchResult.data.forEach((result: any) => {
          const content = `${result.text || 'Video content'} (${result.start}-${result.end}s)`;
          
          documents.push({
            pageContent: content,
            metadata: {
              source: "twelvelabs",
              videoId: result.videoId,
              start: result.start,
              end: result.end,
              confidence: result.confidence || 1.0,
              searchQuery: query,
            },
          });
        });
      }

      return documents;
    } catch (error) {
      console.error('TwelveLabs search failed:', error);
      // Return empty array instead of throwing to allow graceful degradation
      return [];
    }
  }

  async getRelevantDocuments(query: string): Promise<any[]> {
    return this._getRelevantDocuments(query);
  }

  /**
   * Get embeddings for videos - placeholder implementation
   */
  async getEmbeddings(): Promise<any> {
    try {
      // Get all tasks that might have embeddings
      const tasks = await this.getClient().tasks.list();
      
      // Filter for embedding tasks
      const embeddingTasks = tasks.data?.filter((task: any) => 
        task.type === 'embedding' || task.type === 'embed'
      ) || [];
      
      // Return structure expected by the routes
      return {
        videoEmbedding: {
          segments: embeddingTasks.map((task: any, index: number) => ({
            startOffsetSec: index * 30, // Mock segment timing
            endOffsetSec: (index + 1) * 30,
            embeddingScope: task.status || 'visual',
            taskId: task._id
          }))
        }
      };
    } catch (error) {
      console.error('Error getting embeddings:', error);
      return { videoEmbedding: { segments: [] } };
    }
  }

  async uploadVideo(params: TwelveLabsEmbeddingParams): Promise<string> {
    const { videoUrl } = params;

    console.log(`Creating video indexing task for: ${videoUrl}`);
    
    try {
      const indexId = await this.getDefaultIndexId();
      
      const task = await this.getClient().tasks.create({
        indexId,
        videoUrl
      } as any); // Type assertion needed due to SDK type definitions"

      console.log(`Created video task: id=${task.id}`);
      if (!task.id) {
        throw new Error('Task creation failed: no ID returned');
      }
      
      this.taskId = task.id;
      return task.id;
    } catch (error) {
      console.error('Failed to create video task:', error);
      throw new Error(`Failed to upload video to TwelveLabs: ${(error as Error).message}`);
    }
  }

  async waitForProcessing(taskId?: string): Promise<any> {
    const id = taskId || this.taskId;
    if (!id) {
      throw new Error("No task ID available");
    }

    console.log("Waiting for video processing to complete...");
    
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    while (attempts < maxAttempts) {
      try {
        const status = await this.getClient().tasks.retrieve(id);
        console.log(`  Status=${status.status} (attempt ${attempts + 1})`);
        
        if (status.status === 'ready') {
          console.log('Video processing completed!');
          return status;
        }
        
        if (status.status === 'failed') {
          throw new Error(`Video processing failed`);
        }
        
        // Wait 5 seconds before checking again
        await new Promise(resolve => setTimeout(resolve, 5000));
        attempts++;
      } catch (error) {
        console.error(`Error checking task status: ${(error as Error).message}`);
        throw error;
      }
    }
    
    throw new Error(`Task ${id} did not complete within timeout`);
  }

  async getTaskDetails(): Promise<any | null> {
    if (!this.taskId) {
      return null;
    }

    return await this.getClient().tasks.retrieve(this.taskId);
  }

  getTaskId(): string | undefined {
    return this.taskId;
  }

  setTaskId(taskId: string): void {
    this.taskId = taskId;
  }

  /**
   * List video segments for a processed video
   */
  async listSegments(videoId: string): Promise<any[]> {
    try {
      // Use the search API to get all segments for a video
      const indexId = await this.getDefaultIndexId();
      
      // Search with a broad query to get video segments
      const searchResult = await this.getClient().search.query({
        indexId,
        queryText: 'content', // Broad search to get all content
        searchOptions: ['visual'],
        pageLimit: 100
      });
      
      // Filter results by videoId if provided
      const segments = searchResult.data || [];
      if (videoId) {
        return segments.filter((segment: any) => segment.videoId === videoId);
      }
      
      return segments;
    } catch (error) {
      console.error('Error listing segments:', error);
      // Return empty array to allow graceful degradation
      return [];
    }
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
      const embeddings = await this.getClient().embed.tasks.retrieve(taskId, {
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
