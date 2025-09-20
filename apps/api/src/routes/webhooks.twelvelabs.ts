import type { FastifyInstance } from 'fastify';
import { createHash, createHmac } from 'crypto';
import { Db } from '../services/db.js';
import { TwelveLabsRetriever } from '../services/twelvelabs.js';
import { SSEService } from '../services/sse.js';
import type { VideoSegment } from '@edutube/types';

interface TwelveLabsWebhookPayload {
  event_type: 'video.embed.task.done' | 'video.embed.task.failed';
  task_id: string;
  video_id?: string;
  status: 'completed' | 'failed';
  created_at: string;
  updated_at: string;
}

function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;
  
  const expectedSignature = createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  // TwelveLabs typically sends signatures with 'sha256=' prefix
  const receivedSignature = signature.startsWith('sha256=') 
    ? signature.slice(7) 
    : signature;
  
  return createHash('sha256').update(expectedSignature).digest('hex') === 
         createHash('sha256').update(receivedSignature).digest('hex');
}

export async function registerTwelveLabsWebhookRoutes(app: FastifyInstance) {
  app.post('/webhooks/twelvelabs', async (req, reply) => {
    try {
      const rawPayload = JSON.stringify(req.body);
      const signature = req.headers['x-twelvelabs-signature'] as string;
      const webhookSecret = process.env.TWELVELABS_WEBHOOK_SECRET;
      
      // Verify webhook signature if secret is configured
      if (webhookSecret) {
        const isValid = verifyWebhookSignature(rawPayload, signature, webhookSecret);
        if (!isValid) {
          app.log.warn('Invalid TwelveLabs webhook signature');
          return reply.code(401).send({ error: 'Invalid signature' });
        }
      }
      
      const payload = req.body as TwelveLabsWebhookPayload;
      
      if (!payload.task_id) {
        return reply.code(400).send({ error: 'task_id is required' });
      }
      
      app.log.info({ 
        event: 'twelvelabs.webhook', 
        taskId: payload.task_id,
        eventType: payload.event_type,
        status: payload.status 
      }, 'Received TwelveLabs webhook');
      
      // Find video by task ID
      const videos = await Db.listVideos(1000); // Get more videos to search
      const video = videos.find(v => v.taskId === payload.task_id);
      
      if (!video) {
        app.log.warn(`No video found for task ID: ${payload.task_id}`);
        return reply.code(404).send({ error: 'Video not found' });
      }
      
      const now = new Date().toISOString();
      
      if (payload.event_type === 'video.embed.task.done' && payload.status === 'completed') {
        // Video embedding completed successfully
        try {
          // Retrieve segments from TwelveLabs
          const retriever = new TwelveLabsRetriever();
          retriever.setTaskId(payload.task_id);
          const embeddings = await retriever.getEmbeddings();
          
          let segments: VideoSegment[] = [];
          let segmentCount = 0;
          
          if (embeddings?.videoEmbedding?.segments) {
            segments = embeddings.videoEmbedding.segments
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
            
            segmentCount = segments.length;
            
            // Persist segments to Firestore
            if (segments.length > 0) {
              await Db.upsertVideoSegments(segments);
            }
          }
          
          // Update video status to ready
          await Db.upsertVideo({
            ...video,
            status: 'ready',
            segmentCount,
            updatedAt: now,
            extra: {
              ...video.extra,
              completedAt: now,
              segmentsExtracted: segmentCount,
            },
          });
          
          app.log.info(`Video ${video.id} processing completed: ${segmentCount} segments extracted`);
          
          // Send SSE notification to connected clients
          SSEService.broadcast(video.id, {
            event: 'video.ready',
            data: {
              videoId: video.id,
              status: 'ready',
              segmentCount,
              message: 'Video processing completed successfully'
            }
          });
          
        } catch (error) {
          app.log.error(error, `Failed to process completed video ${video.id}`);
          
          // Mark as failed
          await Db.upsertVideo({
            ...video,
            status: 'failed',
            updatedAt: now,
            extra: {
              ...video.extra,
              error: (error as Error).message,
              failedAt: now,
            },
          });
        }
        
      } else if (payload.event_type === 'video.embed.task.failed' || payload.status === 'failed') {
        // Video embedding failed
        await Db.upsertVideo({
          ...video,
          status: 'failed',
          updatedAt: now,
          extra: {
            ...video.extra,
            error: 'TwelveLabs processing failed',
            failedAt: now,
          },
        });
        
        app.log.error(`Video ${video.id} processing failed`);
        
        // Send SSE notification for failure
        SSEService.broadcast(video.id, {
          event: 'video.failed',
          data: {
            videoId: video.id,
            status: 'failed',
            message: 'Video processing failed'
          }
        });
      }
      
      return reply.send({ ok: true, videoId: video.id, status: video.status });
      
    } catch (error) {
      app.log.error(error, 'Webhook processing error');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}
