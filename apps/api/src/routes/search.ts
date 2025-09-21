import type { FastifyInstance } from 'fastify';
import { TwelveLabsRetriever, SearchHit } from '../services/twelvelabs.js';
import { GeminiService } from '../services/gemini.js';
import { Db } from '../services/db.js';

export async function registerSearchRoutes(app: FastifyInstance) {
  // The killer demo feature: semantic search through lecture videos!
  app.post('/search', async (req, reply) => {
    try {
      const body = (req.body || {}) as { 
        videoId?: string; 
        query?: string; 
        limit?: number;
        summarize?: boolean;
      };
      
      const { videoId, query, limit = 10, summarize = false } = body;
      
      // Validation
      if (!query?.trim()) {
        return reply.code(400).send({ 
          error: 'query is required',
          example: { videoId: 'abc123', query: 'neural networks' }
        });
      }
      
      if (!videoId) {
        return reply.code(400).send({ 
          error: 'videoId is required',
          example: { videoId: 'abc123', query: 'neural networks' }
        });
      }

      // Get video metadata to find taskId
      const video = await Db.getVideo(videoId);
      if (!video) {
        return reply.code(404).send({ error: 'Video not found' });
      }

      if (video.status !== 'ready') {
        return reply.code(400).send({ 
          error: `Video not ready for search. Current status: ${video.status}`,
          videoStatus: video.status,
          message: video.status === 'indexing' 
            ? 'Video is still being processed. Please wait for completion.'
            : video.status === 'failed'
            ? 'Video processing failed. Please re-upload.'
            : 'Video needs to be processed before search is available.'
        });
      }

      if (!video.taskId) {
        return reply.code(400).send({ 
          error: 'Video has no taskId - cannot search',
          videoStatus: video.status
        });
      }

      // Perform semantic search
      let retriever;
      try {
        retriever = new TwelveLabsRetriever();
      } catch (error) {
        if ((error as Error).message.includes('TWELVELABS_API_KEY')) {
          return reply.code(503).send({ 
            error: 'Search not available - TwelveLabs API key not configured',
            videoId,
            query: query.trim()
          });
        }
        throw error;
      }
      
      const searchHits = await retriever.searchVideo({
        videoId,
        taskId: video.taskId,
        query: query.trim(),
        limit
      });

      app.log.info({
        videoId,
        query: query.trim(),
        resultsCount: searchHits.length
      }, 'Video search performed');

      // Optional: Generate AI summary of search results
      // OPTIMIZATION: Only generate summary if specifically requested AND sufficient content
      let summary = null;
      if (summarize && searchHits.length > 2) {
        try {
          // Rate limit: Only allow summary if reasonable amount of content
          const totalContent = searchHits.reduce((sum, hit) => sum + (hit.text?.length || 0), 0);
          if (totalContent > 200) { // Only summarize substantial content
            let gemini;
            try {
              gemini = new GeminiService();
            } catch (error) {
              if ((error as Error).message.includes('GOOGLE_API_KEY')) {
                app.log.warn('Gemini API key not configured, skipping summary generation');
                throw new Error('Gemini API key not configured');
              }
              throw error;
            }
            
            const context = searchHits
              .slice(0, 5) // Limit to top 5 results to reduce API usage
              .map((hit, i) => `# Result ${i + 1} (${hit.startSec}-${hit.endSec}s)\n${hit.text}`)
              .join('\n\n');
            
            summary = await gemini.summarize(
              context, 
              `Create concise study notes from these "${query}" video segments. Focus on key concepts and timing.`
            );
          } else {
            app.log.info('Skipping summary - insufficient content for meaningful summarization');
          }
        } catch (error) {
          app.log.warn(error, 'Failed to generate search summary');
        }
      }

      // Return search results with deep links
      const response = {
        query: query.trim(),
        videoId,
        videoTitle: video.title,
        resultsCount: searchHits.length,
        searchTime: new Date().toISOString(),
        hits: searchHits,
        ...(summary && { summary })
      };

      return reply.send(response);

    } catch (error) {
      app.log.error(error, 'Search request failed');
      return reply.code(500).send({
        error: 'Search failed',
        message: (error as Error).message
      });
    }
  });

  // Legacy search endpoint (for backwards compatibility)
  app.post('/search/legacy', async (req, reply) => {
    const body = (req.body || {}) as { query?: string; indexId?: string; videoId?: string; summarize?: boolean };
    const query = body.query?.trim();
    if (!query) {
      return reply.code(400).send({ error: 'query is required' });
    }
    const indexId = body.indexId || process.env.TWELVELABS_INDEX_ID;
    if (!indexId) return reply.code(400).send({ error: 'indexId is required (or set TWELVELABS_INDEX_ID)' });

    let retriever;
    try {
      retriever = new TwelveLabsRetriever();
    } catch (error) {
      if ((error as Error).message.includes('TWELVELABS_API_KEY')) {
        return reply.code(503).send({ 
          error: 'Search not available - TwelveLabs API key not configured',
          query
        });
      }
      throw error;
    }
    
    const docs = await retriever.getRelevantDocuments(query);

    if (body.summarize) {
      let gemini;
      try {
        gemini = new GeminiService();
      } catch (error) {
        if ((error as Error).message.includes('GOOGLE_API_KEY')) {
          return reply.code(503).send({ 
            error: 'Summary not available - Gemini API key not configured',
            query,
            docs
          });
        }
        throw error;
      }
      const context = docs.map((d, i) => `# Result ${i + 1}\n${d.pageContent}`).join('\n\n');
      const summary = await gemini.summarize(context, 'Summarize these video segments into structured study notes.');
      return reply.send({ query, docs, summary });
    }

    return reply.send({ query, docs });
  });
}
