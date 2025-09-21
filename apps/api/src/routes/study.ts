import type { FastifyInstance } from 'fastify';
import { StudyService } from '../services/study.js';

export async function registerStudyRoutes(app: FastifyInstance) {
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

      const result = await StudyService.generateAll(body.videoId, {
        query: body.query,
        maxHits: body.limits?.hits ?? 12,
        flashcardsPerTopic: body.limits?.cards ?? 8,
        quizPerTopic: body.limits?.questions ?? 8,
        summaryLength: body.length ?? 'medium',
        summaryTone: body.tone ?? 'neutral',
      });

      return reply.send(result);
    } catch (err) {
      const message = (err as Error).message;
      app.log.error(err, 'study.generate failed');
      return reply.code(500).send({ error: 'failed', message });
    }
  });
}


