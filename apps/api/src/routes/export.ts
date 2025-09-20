import type { FastifyInstance } from 'fastify';

export async function registerExportRoutes(app: FastifyInstance) {
  app.get('/export/:id', async (_req, reply) => {
    return reply.code(501).send({ error: 'Export not implemented yet' });
  });
}
