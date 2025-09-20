import type { FastifyInstance } from 'fastify';
import { GeminiService } from '../services/gemini.js';

export async function registerNotesRoutes(app: FastifyInstance) {
  // Generate comprehensive study notes from transcript
  app.post('/generateNotes', async (req, reply) => {
    try {
      const body = req.body as { transcript?: string };
      
      // Validation
      if (!body?.transcript?.trim()) {
        return reply.code(400).send({
          error: 'transcript is required',
          example: { transcript: 'Your lecture transcript here...' }
        });
      }

      const transcript = body.transcript.trim();
      
      // Check transcript length (reasonable limits)
      if (transcript.length < 50) {
        return reply.code(400).send({
          error: 'transcript too short - minimum 50 characters required'
        });
      }
      
      if (transcript.length > 50000) {
        return reply.code(400).send({
          error: 'transcript too long - maximum 50,000 characters allowed'
        });
      }

      console.log(`📝 Generating notes for transcript (${transcript.length} chars)...`);

      // Initialize Gemini service
      let geminiService;
      try {
        geminiService = new GeminiService({ temperature: 0.3 });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('GOOGLE_API_KEY')) {
          return reply.code(503).send({
            error: 'Note generation not available - Google API key not configured',
            transcript: `${transcript.substring(0, 100)}...`
          });
        }
        throw error;
      }

      // Set timeout for the operation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout - note generation took too long')), 45000);
      });

      // Generate notes with timeout
      const notesPromise = geminiService.generateNotes(transcript);
      
      const notes = await Promise.race([notesPromise, timeoutPromise]) as Awaited<typeof notesPromise>;

      console.log(`✅ Notes generated successfully: ${notes.summary.length} chars summary, ${notes.flashcards.length} flashcards, ${notes.quiz.length} quiz questions`);

      return {
        success: true,
        transcript_length: transcript.length,
        generated_at: new Date().toISOString(),
        summary: notes.summary,
        flashcards: notes.flashcards,
        quiz: notes.quiz,
        metadata: {
          model: 'gemini-1.5-pro',
          temperature: 0.3,
          processing_time: Date.now()
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('❌ Note generation error:', errorMessage);
      
      if (errorMessage.includes('timeout')) {
        return reply.code(408).send({
          error: 'Request timeout - note generation took too long',
          message: 'Please try again with a shorter transcript or try again later'
        });
      }
      
      if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
        return reply.code(503).send({
          error: 'Service temporarily unavailable - API configuration issue'
        });
      }
      
      if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        return reply.code(429).send({
          error: 'Service rate limited - please try again later'
        });
      }

      return reply.code(500).send({
        error: 'Failed to generate notes',
        message: 'An internal error occurred while processing your transcript'
      });
    }
  });

  // Health check for notes service
  app.get('/notes/health', async () => {
    try {
      // Test Gemini service configuration
      new GeminiService();
      return { 
        ok: true, 
        service: 'notes',
        gemini_configured: !!process.env.GOOGLE_API_KEY,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        service: 'notes',
        error: errorMessage.includes('GOOGLE_API_KEY') ? 'API key not configured' : 'Configuration error',
        timestamp: new Date().toISOString()
      };
    }
  });
}