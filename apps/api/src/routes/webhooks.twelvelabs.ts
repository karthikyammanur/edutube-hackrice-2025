import type { FastifyInstance } from 'fastify';
import { Db } from '../services/db.js';

export async function registerTwelveLabsWebhookRoutes(app: FastifyInstance) {
  app.post('/webhooks/twelvelabs', async (req, reply) => {
    const body = (req.body || {}) as { videoId?: string; status?: string; payload?: unknown };
    if (!body.videoId) return reply.code(400).send({ error: 'videoId is required' });

    // Update Firestore metadata status if provided
    if (body.status) {
      const now = new Date().toISOString();
      await Db.upsertVideo({
        id: body.videoId,
        title: 'Untitled',
        status: (body.status as any) || 'indexing',
        createdAt: now,
        updatedAt: now,
      } as any);
    }

    app.log.info({ event: 'twelvelabs.webhook', body }, 'Received TwelveLabs webhook');
    return reply.send({ ok: true });
  });
}
