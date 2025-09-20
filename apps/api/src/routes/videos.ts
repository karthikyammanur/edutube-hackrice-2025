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
    
    try {
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
      
      try {
        await Db.upsertVideo(meta);
      } catch (dbError) {
        app.log.warn(dbError, 'Failed to save video metadata, continuing with signed URL');
        // Continue even if DB save fails
      }
      
      return reply.send({ videoId, url, objectName });
      
    } catch (error) {
      const errorMessage = (error as Error).message;
      app.log.error(error, 'Failed to generate upload URL');
      
      if (errorMessage.includes('GCS_BUCKET')) {
        return reply.code(503).send({ 
          error: 'File upload not available - Google Cloud Storage not configured'
        });
      }
      
      return reply.code(500).send({ error: 'Failed to generate upload URL' });
    }
  });

  // Kick off TwelveLabs indexing for uploaded videos
  app.post('/videos', async (req, reply) => {
    const body = (req.body || {}) as Partial<VideoMetadata> & { id?: string };
    if (!body.id) return reply.code(400).send({ error: 'id is required' });
    
    // Get existing video metadata
    let existingMeta;
    try {
      existingMeta = await Db.getVideo(body.id);
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('GOOGLE_CLOUD_PROJECT') || errorMessage.includes('credentials')) {
        return reply.code(503).send({ 
          error: 'Database not available - Google Cloud credentials not configured'
        });
      }
      return reply.code(500).send({ error: 'Database error' });
    }
    
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
        const errorMessage = (error as Error).message;
        console.error(`Failed to start TwelveLabs indexing for video ${meta.id}:`, errorMessage);
        
        // If API key is missing, set status to uploaded (no indexing available)
        if (errorMessage.includes('TWELVELABS_API_KEY')) {
          console.log(`TwelveLabs API key not configured, skipping indexing for video ${meta.id}`);
          meta.status = 'uploaded'; // Keep as uploaded, no indexing
          meta.extra = { ...meta.extra, note: 'TwelveLabs indexing not available (API key not configured)' };
        } else {
          meta.status = 'failed';
          meta.extra = { ...meta.extra, error: errorMessage };
        }
      }
    }
    
    try {
      await Db.upsertVideo(meta);
    } catch (error) {
      const errorMessage = (error as Error).message;
      app.log.error(error, 'Failed to save video metadata');
      if (errorMessage.includes('GOOGLE_CLOUD_PROJECT') || errorMessage.includes('credentials')) {
        return reply.code(503).send({ 
          error: 'Database not available - Google Cloud credentials not configured',
          videoId: body.id
        });
      }
      return reply.code(500).send({ error: 'Failed to save video' });
    }
    
    return reply.code(201).send(meta);
  });

  // Fetch one video metadata
  app.get('/videos/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    
    try {
      const meta = await Db.getVideo(id);
      if (!meta) return reply.code(404).send({ error: 'Not found' });
      return reply.send(meta);
    } catch (error) {
      const errorMessage = (error as Error).message;
      app.log.error(error, `Failed to get video ${id}`);
      
      if (errorMessage.includes('GOOGLE_CLOUD_PROJECT') || errorMessage.includes('credentials')) {
        return reply.code(503).send({ 
          error: 'Database not available - Google Cloud credentials not configured',
          videoId: id
        });
      }
      
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Signed upload URL
  app.post('/videos/:id/upload-url', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body || {}) as { fileName?: string; contentType?: string };
    const fileName = body.fileName || 'video.mp4';
    const contentType = body.contentType || 'video/mp4';
    const objectName = Gcs.objectPath('raw', id, fileName);
    
    try {
      const url = await Gcs.generateV4UploadSignedUrl(objectName, contentType);
      return reply.send({ url, objectName });
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('GCS_BUCKET')) {
        return reply.code(503).send({ 
          error: 'File upload not available - Google Cloud Storage not configured',
          videoId: id
        });
      }
      return reply.code(500).send({ error: 'Failed to generate upload URL' });
    }
  });

  // Signed download URL (thumbnail or raw)
  app.get('/videos/:id/download-url', async (req, reply) => {
    const { id } = req.params as { id: string };
    const q = req.query as { kind?: 'raw' | 'thumb' | 'derived'; fileName?: string };
    const objectName = Gcs.objectPath(q.kind || 'raw', id, q.fileName || 'video.mp4');
    
    try {
      const url = await Gcs.generateV4DownloadSignedUrl(objectName);
      return reply.send({ url, objectName });
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('GCS_BUCKET')) {
        return reply.code(503).send({ 
          error: 'File download not available - Google Cloud Storage not configured',
          videoId: id
        });
      }
      return reply.code(500).send({ error: 'Failed to generate download URL' });
    }
  });

  // Poll video status and segments (fallback for webhook debugging)
  app.get('/videos/:id/status', async (req, reply) => {
    const { id } = req.params as { id: string };
    let video;
    try {
      video = await Db.getVideo(id);
    } catch (error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('GOOGLE_CLOUD_PROJECT') || errorMessage.includes('credentials')) {
        return reply.code(503).send({ 
          error: 'Database not available - Google Cloud credentials not configured',
          videoId: id
        });
      }
      return reply.code(500).send({ error: 'Database error' });
    }
    
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
            .filter((seg: any) => seg.startOffsetSec !== undefined && seg.endOffsetSec !== undefined)
            .map((seg: any, index: number) => ({
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
          const updatedVideo = {
            ...video,
            status: 'ready' as const,
            segmentCount: segments.length,
            updatedAt: now,
            segments: segments.slice(0, 10), // Include first 10 segments in response
          };
          
          try {
            if (segments.length > 0) {
              await Db.upsertVideoSegments(segments);
            }
            
            await Db.upsertVideo(updatedVideo);
          } catch (dbError) {
            app.log.error(dbError, 'Failed to save video segments/status to DB');
            // Continue with response even if DB save fails
          }
          
          return reply.send({
            ...updatedVideo,
            totalSegments: segments.length,
            message: 'Processing completed, status updated to ready'
          });
        }
      } catch (error) {
        const errorMessage = (error as Error).message;
        console.error(`Error checking TwelveLabs status for video ${id}:`, errorMessage);
        
        // If API key is missing, update video status to indicate indexing not available
        if (errorMessage.includes('TWELVELABS_API_KEY')) {
          console.log(`TwelveLabs API key not configured, cannot check status for video ${id}`);
          // Don't fail the request, just return current status with note
        } else {
          // Don't fail the request, just return current status
        }
      }
    }

    // Get segments if video is ready
    let segments = video.segments || [];
    if (video.status === 'ready' && (!segments || segments.length === 0)) {
      try {
        segments = await Db.getVideoSegments(id);
      } catch (error) {
        app.log.error(error, `Failed to get video segments for ${id}`);
        // Continue with empty segments if DB call fails
        segments = [];
      }
    }

    return reply.send({
      ...video,
      segments: segments.slice(0, 10), // First 10 segments
      totalSegments: video.segmentCount || segments.length,
    });
  });
}
