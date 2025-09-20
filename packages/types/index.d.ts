export type VideoStatus = 'uploaded' | 'indexing' | 'ready' | 'failed';
export interface VideoMetadata {
    id: string;
    title: string;
    description?: string;
    status: VideoStatus;
    createdAt: string;
    updatedAt: string;
    gcsUri?: string;
    thumbnailGcsUri?: string;
    durationSec?: number;
    extra?: Record<string, unknown>;
}
//# sourceMappingURL=index.d.ts.map