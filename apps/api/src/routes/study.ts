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
          // Extract topics from quiz questions to create meaningful categorization
          const topicsFromQuiz = [...new Set(studyMaterials.quiz.map(q => q.concept))];
          const topics = topicsFromQuiz.length > 0 ? topicsFromQuiz : ['General Knowledge'];
          
          // Distribute flashcards across topics more intelligently
          const flashcardsByTopic: Record<string, any[]> = {};
          
          // Initialize empty arrays for all topics
          topics.forEach(topic => {
            flashcardsByTopic[topic] = [];
          });
          
          // Distribute flashcards evenly across topics
          studyMaterials.flashcards.forEach((fc, index) => {
            const topicIndex = index % topics.length;
            const assignedTopic = topics[topicIndex];
            
            flashcardsByTopic[assignedTopic].push({
              question: fc.question,
              answer: fc.answer,
              topic: assignedTopic,
              difficulty: 'medium' as const
            });
          });
          
          // Distribute quiz questions across topics based on their concepts
          const quizByTopic: Record<string, any[]> = {};
          
          // Initialize empty arrays for all topics
          topics.forEach(topic => {
            quizByTopic[topic] = [];
          });
          
          // Distribute quiz questions to their matching topics
          studyMaterials.quiz.forEach(q => {
            const questionTopic = q.concept;
            
            // Find the best matching topic or use the first topic as fallback
            let assignedTopic = topics.find(topic => 
              topic.toLowerCase().includes(questionTopic.toLowerCase()) ||
              questionTopic.toLowerCase().includes(topic.toLowerCase())
            ) || topics[0];
            
            quizByTopic[assignedTopic].push({
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
            });
          });
          
          const result = {
            videoId,
            hits: [], // No hits needed for automatically generated content
            summary: studyMaterials.summary,
            topics,
            flashcardsByTopic,
            quizByTopic
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


