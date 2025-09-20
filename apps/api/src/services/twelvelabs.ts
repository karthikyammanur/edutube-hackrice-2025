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
}
