// Debug server startup to catch any crashes
import 'dotenv/config';

console.log('🚀 Starting debug server...');

try {
  const { buildServer } = await import('../dist/index.js');
  console.log('✅ Server module loaded');
  
  const app = await buildServer();
  console.log('✅ Server built');
  
  await app.listen({ host: '127.0.0.1', port: 3000 });
  console.log('✅ Server listening on http://127.0.0.1:3000');
  
} catch (error) {
  console.error('❌ Server startup error:', error);
  process.exit(1);
}