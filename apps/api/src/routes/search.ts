import type { FastifyInstance } from 'fastify';
import { TwelveLabsRetriever } from '../services/twelvelabs.js';
import { GeminiService } from '../services/gemini.js';

export async function registerSearchRoutes(app: FastifyInstance) {
  app.post('/search', async (req, reply) => {
    const body = (req.body || {}) as { query?: string; indexId?: string; videoId?: string; summarize?: boolean };
    const query = body.query?.trim();
    if (!query) {
      return reply.code(400).send({ error: 'query is required' });
    }
    const indexId = body.indexId || process.env.TWELVELABS_INDEX_ID;
    if (!indexId) return reply.code(400).send({ error: 'indexId is required (or set TWELVELABS_INDEX_ID)' });

    const retriever = new TwelveLabsRetriever({ indexId, videoId: body.videoId });
    const docs = await retriever.getRelevantDocuments(query);

    if (body.summarize) {
      const gemini = new GeminiService();
      const context = docs.map((d, i) => `# Result ${i + 1}\n${d.pageContent}`).join('\n\n');
      const summary = await gemini.summarize(context, 'Summarize these video segments into structured study notes.');
      return reply.send({ query, docs, summary });
    }

    return reply.send({ query, docs });
  });
}
