import { FastifyInstance } from 'fastify';
import { StudyService } from '../services/study.js';
import { Db } from '../services/db.js';

// Request deduplication cache to prevent concurrent API calls for same video
const activeRequests = new Map<string, Promise<any>>();
const studyMaterialsCache = new Map<string, { data: any, timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const REQUEST_COOLDOWN = 30 * 1000; // 30 seconds between requests
const lastRequestTimes = new Map<string, number>();

export async function registerStudyRoutes(app: FastifyInstance) {
  // NEW: Serve automatically generated study materials
  app.post('/study/generate', async (req, reply) => {
    try {
      const body = (req.body || {}) as {
        videoId?: string;
        query?: string;
        limits?: { hits?: number; cards?: number; questions?: number };
        length?: 'short' | 'medium' | 'long';
        tone?: string;
      };

      if (!body.videoId) {
        return reply.code(400).send({ error: 'videoId is required' });
      }

      const videoId = body.videoId;
      console.log(`📖 [STUDY-API] Retrieving automatically generated study materials for video ${videoId}`);
      
      // Check if materials were automatically generated
      try {
        const studyMaterials = await Db.getStudyMaterials(videoId);
        
        if (studyMaterials) {
          console.log(`✅ [STUDY-API] Found automatically generated materials for video ${videoId}`);
          
          // Convert to the expected format for backward compatibility
          const result = {
            videoId,
            hits: [], // No hits needed for automatically generated content
            summary: studyMaterials.summary,
            topics: ['Generated Content'], // Simple topic for automatically generated content
            flashcardsByTopic: {
              'Generated Content': studyMaterials.flashcards.map(fc => ({
                question: fc.question,
                answer: fc.answer,
                topic: 'Generated Content',
                difficulty: 'medium' as const
              }))
            },
            quizByTopic: {
              'Generated Content': studyMaterials.quiz.map(q => ({
                type: 'multiple_choice' as const,
                prompt: q.question,
                choices: q.options.map((opt, idx) => ({ 
                  id: ['a', 'b', 'c', 'd'][idx], 
                  text: opt 
                })),
                answer: ['a', 'b', 'c', 'd'][q.correctAnswer],
                explanation: `This question tests understanding of: ${q.concept}. Timestamp: ${q.timestamp}`,
                topic: q.concept,
                difficulty: 'medium' as const
              }))
            }
          };
          
          return reply.send(result);
        }
      } catch (dbError) {
        console.error('❌ [STUDY-API] Database error retrieving study materials:', dbError);
      }
      
      // Fallback: Check if video is ready for processing
      const video = await Db.getVideo(videoId);
      if (!video) {
        return reply.code(404).send({ error: 'Video not found' });
      }
      
      if (video.status !== 'ready') {
        return reply.code(400).send({ 
          error: 'Study materials not available yet',
          videoStatus: video.status,
          message: video.status === 'indexing' 
            ? 'Video is still being processed. Study materials will be generated automatically.' 
            : 'Video needs to be processed before study materials are available.'
        });
      }
      
      // If no automatically generated materials and video is ready, 
      // check if generation is in progress or failed
      if (video.extra?.studyMaterialsError) {
        return reply.code(500).send({
          error: 'Study materials generation failed',
          message: video.extra.studyMaterialsError,
          errorAt: video.extra.studyMaterialsErrorAt
        });
      }
      
      return reply.code(202).send({
        message: 'Study materials are being generated automatically. Please check back in a moment.',
        videoStatus: video.status,
        studyMaterialsReady: !!video.extra?.studyMaterialsReady
      });
      
    } catch (err) {
      const message = (err as Error).message;
      app.log.error(err, 'study materials retrieval failed');
      return reply.code(500).send({ error: 'failed', message });
    }
  });
}


