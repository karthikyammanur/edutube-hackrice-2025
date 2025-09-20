import Fastify from 'fastify';
import cors from '@fastify/cors';

import { registerVideoRoutes } from './routes/videos.js';
import { registerSearchRoutes } from './routes/search.js';
import { registerExportRoutes } from './routes/export.js';
import { registerTwelveLabsWebhookRoutes } from './routes/webhooks.twelvelabs.js';
import { registerSSERoutes } from './services/sse.js';

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
  await registerSSERoutes(app);

  return app;
}

async function main() {
  const app = await buildServer();
  try {
    await app.listen({ host: HOST, port: PORT });
    app.log.info(`API listening on http://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
