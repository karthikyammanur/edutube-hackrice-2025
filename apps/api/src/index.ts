import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';

import { registerVideoRoutes } from './routes/videos.js';
import { registerSearchRoutes } from './routes/search.js';
import { registerExportRoutes } from './routes/export.js';
import { registerTwelveLabsWebhookRoutes } from './routes/webhooks.twelvelabs.js';
import { registerNotesRoutes } from './routes/notes.js';
// import { registerSSERoutes } from './services/sse.js';

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '127.0.0.1';

async function buildServer() {
  const app = Fastify({ logger: true });

  await app.register(cors, {
    origin: (_origin, cb) => cb(null, true),
    credentials: true,
  });

  app.get('/health', async () => ({ ok: true }));

  await registerVideoRoutes(app);
  await registerSearchRoutes(app);
  await registerExportRoutes(app);
  await registerTwelveLabsWebhookRoutes(app);
  await registerNotesRoutes(app);
  // await registerSSERoutes(app);

  return app;
}

// Add global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

async function main() {
  try {
    console.log('Building server...');
    const app = await buildServer();
    console.log('Server built successfully, starting to listen...');
    
    await app.listen({ host: HOST, port: PORT });
    app.log.info(`API listening on http://${HOST}:${PORT}`);
    
    console.log('Server listen completed, setting up heartbeat...');
    
    // Keep alive
    setInterval(() => {
      console.log('Server heartbeat:', new Date().toISOString());
    }, 5000);
    
    console.log('Heartbeat interval set up, server should be running...');
    
    // Test server is actually responding
    setTimeout(async () => {
      try {
        console.log('Self-testing server health...');
        const response = await fetch(`http://${HOST}:${PORT}/health`);
        console.log('Self-test result:', response.status);
      } catch (err) {
        console.error('Self-test failed:', err);
      }
    }, 1000);
    
  } catch (err) {
    console.error('Server startup failed:', err);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Main function failed:', err);
  process.exit(1);
});
