export type VideoStatus = 'uploaded' | 'indexing' | 'ready' | 'failed';

export interface VideoSegment {
  id: string;
  videoId: string;
  startSec: number;
  endSec: number;
  text: string;
  embeddingScope?: string; // 'visual-text' | 'audio'
  confidence?: number;
  createdAt: string;
}

export interface VideoMetadata {
  id: string;
  ownerId?: string;
  title: string;
  description?: string;
  status: VideoStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  gcsUri?: string;
  gcsObject?: string; // GCS object path
  thumbnailGcsUri?: string;
  durationSec?: number;
  // TwelveLabs integration fields
  indexId?: string;
  taskId?: string;
  segments?: VideoSegment[]; // Cached segments for quick access
  segmentCount?: number;
  extra?: Record<string, unknown>;
}
