export type VideoStatus = 'uploaded' | 'indexing' | 'ready' | 'failed';

export interface VideoMetadata {
  id: string;
  title: string;
  description?: string;
  status: VideoStatus;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  gcsUri?: string;
  thumbnailGcsUri?: string;
  durationSec?: number;
  extra?: Record<string, unknown>;
}
