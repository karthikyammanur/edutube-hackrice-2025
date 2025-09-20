// Simple test server to verify network connectivity
import Fastify from 'fastify';

const app = Fastify({ logger: true });

app.get('/test', async () => {
  return { message: 'Simple test server working!', timestamp: new Date().toISOString() };
});

app.get('/health', async () => {
  return { ok: true, status: 'healthy' };
});

const PORT = 3001;
const HOST = '127.0.0.1';

console.log('Starting simple test server...');

try {
  await app.listen({ host: HOST, port: PORT });
  console.log(`✅ Simple test server running on http://${HOST}:${PORT}`);
  console.log('Try: curl http://127.0.0.1:3001/test');
} catch (err) {
  console.error('❌ Failed to start test server:', err);
}