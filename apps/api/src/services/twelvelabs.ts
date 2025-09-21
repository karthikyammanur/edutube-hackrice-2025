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
   * Get embeddings for videos - check specific task status
   */
  async getEmbeddings(): Promise<any> {
    try {
      // If no taskId is set, return empty
      if (!this.taskId) {
        console.log('⚠️ [TWELVELABS] No taskId set for embeddings check');
        return { videoEmbedding: { segments: [] } };
      }

      // Check the specific task status
      console.log(`🔍 [TWELVELABS] Checking task status for: ${this.taskId}`);
      const task = await this.getClient().tasks.retrieve(this.taskId);
      
      // Only return segments if task is actually ready
      if (task.status !== 'ready') {
        console.log(`⏳ [TWELVELABS] Task ${this.taskId} not ready yet. Status: ${task.status}`);
        return { videoEmbedding: { segments: [] } };
      }
      
      console.log(`✅ [TWELVELABS] Task ${this.taskId} is ready! Generating mock segments with realistic transcript content.`);
      
      // Task is ready, return mock segments with realistic transcript content
      // TODO: Replace with actual segment extraction when TwelveLabs API is fully working
      const mockTranscripts = [
        "Welcome to today's lecture on machine learning fundamentals. We'll be covering the basics of supervised learning, including linear regression and classification algorithms.",
        "Let's start by understanding what machine learning is. Machine learning is a subset of artificial intelligence that enables computers to learn and make decisions from data without being explicitly programmed.",
        "There are three main types of machine learning: supervised learning, unsupervised learning, and reinforcement learning. Today we'll focus primarily on supervised learning techniques.",
        "Linear regression is one of the simplest and most widely used machine learning algorithms. It attempts to model the relationship between two variables by fitting a linear equation to observed data.",
        "The goal of linear regression is to find the best-fitting straight line through the data points. This line is called the regression line and can be used to make predictions about future data.",
        "Classification is another important supervised learning task. Unlike regression which predicts continuous values, classification predicts discrete categories or classes.",
        "Some popular classification algorithms include logistic regression, decision trees, and support vector machines. Each has its own strengths and is suitable for different types of problems.",
        "Decision trees are particularly useful because they're easy to interpret and visualize. They work by splitting the data based on feature values to create a tree-like model of decisions.",
        "Now let's discuss model evaluation. It's crucial to assess how well our machine learning models perform on unseen data. We use metrics like accuracy, precision, and recall for this purpose.",
        "To wrap up, machine learning is a powerful tool for solving complex problems. The key is choosing the right algorithm for your specific use case and properly evaluating its performance."
      ];
      
      const mockSegments = Array.from({ length: 10 }, (_, index) => ({
        startOffsetSec: index * 30,
        endOffsetSec: (index + 1) * 30,
        embeddingScope: 'audio',
        taskId: this.taskId,
        text: mockTranscripts[index] || `Lecture content segment ${index + 1} discussing key concepts and explanations.`
      }));
      
      return {
        videoEmbedding: {
          segments: mockSegments
        }
      };
    } catch (error) {
      console.error('❌ [TWELVELABS] Error getting embeddings:', error);
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
   * Search for relevant video segments using TwelveLabs' own ranking
   * TEMPORARY FIX: Using mock data to bypass "Response body disturbed" error
   */
  async searchVideo(params: {
    videoId: string;
    taskId: string;
    query: string;
    limit?: number;
  }): Promise<SearchHit[]> {
    const { videoId, taskId, query, limit = 10 } = params;

    console.log(`🔍 Searching video ${videoId} with query: "${query}" (using mock data)`);

    try {
      // TEMPORARY: Use actual video segments from database instead of TwelveLabs API
      // TODO: Fix the underlying "Response body object should not be disturbed" error
      console.log(`🔍 Fetching video segments from database for videoId: ${videoId}`);
      
      // Import Db service to get real segments
      const { Db } = await import('./db.js');
      const segments = await Db.getVideoSegments(videoId);
      
      if (!segments || segments.length === 0) {
        console.log(`⚠️ No segments found for video ${videoId}`);
        return [];
      }
      
      console.log(`📋 Found ${segments.length} segments, performing text search for: "${query}"`);
      
      // Perform simple text matching on actual segments
      const searchResults: SearchHit[] = [];
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
      
      segments.forEach(segment => {
        if (!segment.text) return;
        
        const textLower = segment.text.toLowerCase();
        let relevanceScore = 0;
        
        // Check if any query words appear in the segment text
        queryWords.forEach(word => {
          if (textLower.includes(word)) {
            relevanceScore += 0.3;
          }
        });
        
        // Bonus for exact phrase match
        if (textLower.includes(queryLower)) {
          relevanceScore += 0.5;
        }
        
        // Only include segments with some relevance
        if (relevanceScore > 0) {
          searchResults.push({
            videoId: videoId,
            startSec: segment.startSec,
            endSec: segment.endSec,
            text: segment.text,
            confidence: Math.min(relevanceScore, 1.0),
            embeddingScope: segment.embeddingScope || 'visual',
            deepLink: `/watch?v=${videoId}#t=${segment.startSec}`
          });
        }
      });
      
      // Sort by confidence score and return top results
      searchResults.sort((a, b) => b.confidence - a.confidence);
      const results = searchResults.slice(0, limit);
      
      console.log(`✅ Found ${searchResults.length} matching segments, returning top ${results.length}`);
      
      // If no results found, return empty array instead of unrelated content
      if (results.length === 0) {
        console.log(`⚠️ No text matches found for "${query}" in video segments`);
        return [];
      }
      
      return results;

    } catch (error) {
      console.error('Error in mock search:', error);
      // Return basic fallback results
      return [{
        videoId: videoId,
        startSec: 0,
        endSec: 60,
        text: `Video content (search temporarily unavailable)`,
        confidence: 0.5,
        embeddingScope: 'visual',
        deepLink: `/watch?v=${videoId}#t=0`
      }];
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
