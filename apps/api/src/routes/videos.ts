import type { FastifyInstance } from 'fastify';
import { Gcs } from '../services/storage.js';
import { Db } from '../services/db.js';
import { TwelveLabsRetriever } from '../services/twelvelabs.js';
import { StudyService } from '../services/study.js';
import { AutomaticStudyGenerator } from '../services/automatic-study-generator.js';
import { randomUUID } from 'crypto';
import type { VideoMetadata } from '@edutube/types';

/**
 * Automatic study materials generation function
 * Implements the exact workflow specified in prompts.txt
 */
async function automaticGenerateStudyMaterials(videoId: string, taskId: string): Promise<void> {
  console.log(`🎯 [AUTO-GEN] Starting automatic workflow for video ${videoId}, task ${taskId}`);
  
  try {
    // Safety check: Verify task is ready before proceeding
    console.log('🔒 [AUTO-GEN] Safety check: Verifying task status...');
    const retriever = new TwelveLabsRetriever();
    retriever.setTaskId(taskId);
    const taskStatus = await retriever.getTaskDetails();
    
    if (taskStatus && taskStatus.status !== 'ready') {
      console.log(`⚠️ [AUTO-GEN] Task ${taskId} not ready yet (status: ${taskStatus.status}), skipping automatic generation`);
      throw new Error(`Task not ready for study generation. Status: ${taskStatus.status}`);
    }
    
    console.log(`✅ [AUTO-GEN] Task ${taskId} confirmed ready, proceeding with generation`);
    
    // Step 1: Get video segments from database
    console.log('📝 [AUTO-GEN] Step 1: Loading video segments...');
    const segments = await Db.getVideoSegments(videoId);
    if (!segments || segments.length === 0) {
      throw new Error(`No segments found for video ${videoId}`);
    }
    console.log(`✅ [AUTO-GEN] Loaded ${segments.length} video segments`);
    
    // Step 2: Get video metadata for duration
    const video = await Db.getVideo(videoId);
    if (!video || !video.durationSec) {
      throw new Error(`Video metadata or duration missing for video ${videoId}`);
    }
    
    // Step 3: Single Gemini API call to generate all materials from segments
    console.log('🤖 [AUTO-GEN] Step 3: Generating study materials via single Gemini API call...');
    const studyGenerator = new AutomaticStudyGenerator();
    const studyMaterials = await studyGenerator.generateStudyMaterials(segments, video.durationSec);
    console.log(`✅ [AUTO-GEN] Study materials generated: ${studyMaterials.quiz.length} quiz questions, ${studyMaterials.flashcards.length} flashcards`);
    
    // Step 3: Store materials in database for frontend access
    console.log('💾 [AUTO-GEN] Step 3: Storing materials in database...');
    await Db.storeStudyMaterials(videoId, studyMaterials);
    console.log('✅ [AUTO-GEN] Materials stored successfully');
    
    // Step 4: Update video status to indicate materials are ready
    const updatedVideo = await Db.getVideo(videoId);
    if (updatedVideo) {
      await Db.upsertVideo({
        ...updatedVideo,
        extra: {
          ...updatedVideo.extra,
          studyMaterialsReady: true,
          studyMaterialsGeneratedAt: new Date().toISOString()
        },
        updatedAt: new Date().toISOString()
      });
    }
    
    console.log(`🎉 [AUTO-GEN] Automatic workflow completed successfully for video ${videoId}`);
    
  } catch (error) {
    console.error(`❌ [AUTO-GEN] Automatic workflow failed for video ${videoId}:`, error);
    
    // Store error information
    try {
      const video = await Db.getVideo(videoId);
      if (video) {
        await Db.upsertVideo({
          ...video,
          extra: {
            ...video.extra,
            studyMaterialsError: (error as Error).message,
            studyMaterialsErrorAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        });
      }
    } catch (dbError) {
      console.error('❌ [AUTO-GEN] Failed to store error information:', dbError);
    }
    
    throw error;
  }
}

export async function registerVideoRoutes(app: FastifyInstance) {
  // Generate signed upload URL for new video (without needing existing video ID)
  app.post('/videos/upload-url', async (req, reply) => {
    const body = (req.body || {}) as { fileName?: string; contentType?: string; ownerId?: string; durationSec?: number };
    const videoId = randomUUID();
    const fileName = body.fileName || 'video.mp4';
    const contentType = body.contentType || 'video/mp4';
    const durationSec = body.durationSec;
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
        durationSec: durationSec,
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

  // Secure video streaming endpoint for Video.js player
  app.get('/videos/:id/stream', async (req, reply) => {
    const { id } = req.params as { id: string };
    
    try {
      // Get video metadata to verify it exists and is ready
      const video = await Db.getVideo(id);
      if (!video) {
        return reply.code(404).send({ error: 'Video not found' });
      }
      
      if (video.status !== 'ready') {
        return reply.code(400).send({ 
          error: `Video not ready for streaming. Current status: ${video.status}`,
          videoId: id,
          status: video.status
        });
      }
      
      if (!video.gcsObject) {
        return reply.code(400).send({ 
          error: 'Video file not available',
          videoId: id
        });
      }
      
      // Generate signed URL with appropriate expiry for video streaming (4 hours)
      const streamingUrl = await Gcs.generateV4DownloadSignedUrl(video.gcsObject, 4 * 60 * 60);
      
      return reply.send({ 
        streamUrl: streamingUrl,
        videoId: id,
        durationSec: video.durationSec,
        title: video.title,
        status: video.status,
        expiresInSeconds: 4 * 60 * 60,
        // Additional metadata for Video.js
        metadata: {
          duration: video.durationSec,
          title: video.title,
          segmentCount: video.segmentCount,
          createdAt: video.createdAt
        }
      });
      
    } catch (error) {
      const errorMessage = (error as Error).message;
      app.log.error(error, `Failed to generate streaming URL for video ${id}`);
      
      if (errorMessage.includes('GCS_BUCKET')) {
        return reply.code(503).send({ 
          error: 'Video streaming not available - Google Cloud Storage not configured',
          videoId: id
        });
      }
      
      if (errorMessage.includes('GOOGLE_CLOUD_PROJECT') || errorMessage.includes('credentials')) {
        return reply.code(503).send({ 
          error: 'Video streaming not available - Google Cloud credentials not configured',
          videoId: id
        });
      }
      
      return reply.code(500).send({ 
        error: 'Failed to generate streaming URL',
        videoId: id 
      });
    }
  });

  // Signed download URL (thumbnail or raw) - Legacy endpoint
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
        console.log(`🔍 [VIDEO-STATUS] Checking embeddings for task ${video.taskId}...`);
        const embeddings = await retriever.getEmbeddings();
        
        if (embeddings?.videoEmbedding?.segments && embeddings.videoEmbedding.segments.length > 0) {
          console.log(`✅ [VIDEO-STATUS] Found ${embeddings.videoEmbedding.segments.length} segments, marking as ready`);
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
          
          // Fire-and-forget AUTOMATIC generation of study materials
          try {
            console.log(`🚀 [VIDEOS-AUTO] Video ${id} is now ready, starting automatic study materials generation`);
            automaticGenerateStudyMaterials(id, video.taskId!).catch((e: any) => {
              console.error(`❌ [VIDEOS-AUTO] Automatic study generation failed for video ${id}:`, e);
              app.log.error(e, 'Automatic study generation failed');
            });
          } catch (e) {
            console.error(`❌ [VIDEOS-AUTO] Failed to kick off automatic study generation for video ${id}:`, e);
            app.log.error(e, 'Failed to kick off automatic study generation');
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
