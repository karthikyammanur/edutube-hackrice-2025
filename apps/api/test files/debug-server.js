// Debug server to isolate the crash issue
import Fastify from 'fastify';

console.log('Starting debug server...');

// Add global error handlers
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

const fastify = Fastify({
  logger: true
});

// Simple health route
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Try to start the server
try {
  console.log('Creating server...');
  await fastify.listen({ host: '127.0.0.1', port: 3000 });
  console.log('Server started successfully and should stay running...');
  
  // Keep the process alive
  setInterval(() => {
    console.log('Server still running...', new Date().toISOString());
  }, 5000);
  
} catch (err) {
  console.error('Server startup failed:', err);
  process.exit(1);
}