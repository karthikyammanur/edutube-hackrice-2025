import type { FastifyInstance } from 'fastify';
import { Gcs } from '../services/storage.js';
import { Db } from '../services/db.js';
import { TwelveLabsRetriever } from '../services/twelvelabs.js';
import { randomUUID } from 'crypto';
import type { VideoMetadata } from '@edutube/types';

export async function registerVideoRoutes(app: FastifyInstance) {
  // Generate signed upload URL for new video (without needing existing video ID)
  app.post('/videos/upload-url', async (req, reply) => {
    const body = (req.body || {}) as { fileName?: string; contentType?: string; ownerId?: string };
    const videoId = randomUUID();
    const fileName = body.fileName || 'video.mp4';
    const contentType = body.contentType || 'video/mp4';
    const objectName = Gcs.objectPath('raw', videoId, fileName);
    const url = await Gcs.generateV4UploadSignedUrl(objectName, contentType);
    
    // Pre-create video metadata with uploaded status
    const now = new Date().toISOString();
    const meta: VideoMetadata = {
      id: videoId,
      ownerId: body.ownerId,
      title: 'Untitled',
      status: 'uploaded',
      gcsObject: objectName,
      createdAt: now,
      updatedAt: now,
      extra: {},
    };
    await Db.upsertVideo(meta);
    
    return reply.send({ videoId, url, objectName });
  });

  // Kick off TwelveLabs indexing for uploaded videos
  app.post('/videos', async (req, reply) => {
    const body = (req.body || {}) as Partial<VideoMetadata> & { id?: string };
    if (!body.id) return reply.code(400).send({ error: 'id is required' });
    
    // Get existing video metadata
    const existingMeta = await Db.getVideo(body.id);
    if (!existingMeta) return reply.code(404).send({ error: 'Video not found' });
    
    const now = new Date().toISOString();
    const meta: VideoMetadata = {
      ...existingMeta,
      title: body.title || existingMeta.title,
      description: body.description || existingMeta.description,
      ownerId: body.ownerId || existingMeta.ownerId,
      updatedAt: now,
      extra: { ...existingMeta.extra, ...body.extra },
    };
    
    // If video is uploaded and we have a GCS object, trigger TwelveLabs indexing
    if (meta.status === 'uploaded' && meta.gcsObject && !meta.taskId) {
      try {
        // Generate signed read URL for TwelveLabs
        const videoUrl = await Gcs.generateV4DownloadSignedUrl(meta.gcsObject, 60 * 60); // 1 hour expiry
        
        // Create TwelveLabs embedding task
        const retriever = new TwelveLabsRetriever();
        const taskId = await retriever.uploadVideo({ videoUrl });
        
        // Update metadata with TwelveLabs info
        meta.taskId = taskId;
        meta.status = 'indexing';
        meta.updatedAt = new Date().toISOString();
        
        console.log(`Started TwelveLabs indexing for video ${meta.id}, taskId: ${taskId}`);
      } catch (error) {
        console.error(`Failed to start TwelveLabs indexing for video ${meta.id}:`, error);
        meta.status = 'failed';
        meta.extra = { ...meta.extra, error: (error as Error).message };
      }
    }
    
    await Db.upsertVideo(meta);
    return reply.code(201).send(meta);
  });

  // Fetch one video metadata
  app.get('/videos/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const meta = await Db.getVideo(id);
    if (!meta) return reply.code(404).send({ error: 'Not found' });
    return reply.send(meta);
  });

  // Signed upload URL
  app.post('/videos/:id/upload-url', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body || {}) as { fileName?: string; contentType?: string };
    const fileName = body.fileName || 'video.mp4';
    const contentType = body.contentType || 'video/mp4';
    const objectName = Gcs.objectPath('raw', id, fileName);
    const url = await Gcs.generateV4UploadSignedUrl(objectName, contentType);
    return reply.send({ url, objectName });
  });

  // Signed download URL (thumbnail or raw)
  app.get('/videos/:id/download-url', async (req, reply) => {
    const { id } = req.params as { id: string };
    const q = req.query as { kind?: 'raw' | 'thumb' | 'derived'; fileName?: string };
    const objectName = Gcs.objectPath(q.kind || 'raw', id, q.fileName || 'video.mp4');
    const url = await Gcs.generateV4DownloadSignedUrl(objectName);
    return reply.send({ url, objectName });
  });

  // Poll video status and segments (fallback for webhook debugging)
  app.get('/videos/:id/status', async (req, reply) => {
    const { id } = req.params as { id: string };
    const video = await Db.getVideo(id);
    
    if (!video) {
      return reply.code(404).send({ error: 'Video not found' });
    }

    // If video is still indexing, check TwelveLabs status
    if (video.status === 'indexing' && video.taskId) {
      try {
        const retriever = new TwelveLabsRetriever();
        retriever.setTaskId(video.taskId);
        
        // Check if embedding is complete
        const embeddings = await retriever.getEmbeddings();
        
        if (embeddings?.videoEmbedding?.segments) {
          // Processing completed, update status manually
          const now = new Date().toISOString();
          const segments = embeddings.videoEmbedding.segments
            .filter(seg => seg.startOffsetSec !== undefined && seg.endOffsetSec !== undefined)
            .map((seg, index) => ({
              id: `${video.id}_${index}`,
              videoId: video.id,
              startSec: seg.startOffsetSec!,
              endSec: seg.endOffsetSec!,
              text: seg.embeddingScope === 'visual-text' 
                ? `Visual content from ${seg.startOffsetSec}s to ${seg.endOffsetSec}s`
                : `Audio content from ${seg.startOffsetSec}s to ${seg.endOffsetSec}s`,
              embeddingScope: seg.embeddingScope,
              createdAt: now,
            }));
          
          // Persist segments and update status
          if (segments.length > 0) {
            await Db.upsertVideoSegments(segments);
          }
          
          const updatedVideo = {
            ...video,
            status: 'ready' as const,
            segmentCount: segments.length,
            updatedAt: now,
            segments: segments.slice(0, 10), // Include first 10 segments in response
          };
          
          await Db.upsertVideo(updatedVideo);
          
          return reply.send({
            ...updatedVideo,
            totalSegments: segments.length,
            message: 'Processing completed, status updated to ready'
          });
        }
      } catch (error) {
        console.error(`Error checking TwelveLabs status for video ${id}:`, error);
        // Don't fail the request, just return current status
      }
    }

    // Get segments if video is ready
    let segments = video.segments || [];
    if (video.status === 'ready' && (!segments || segments.length === 0)) {
      segments = await Db.getVideoSegments(id);
    }

    return reply.send({
      ...video,
      segments: segments.slice(0, 10), // First 10 segments
      totalSegments: video.segmentCount || segments.length,
    });
  });
}
