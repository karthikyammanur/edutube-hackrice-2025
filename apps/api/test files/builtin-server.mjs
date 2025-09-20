// Ultra-simple HTTP server using Node.js built-in http module
import http from 'http';

const server = http.createServer((req, res) => {
  console.log(`📥 Request: ${req.method} ${req.url}`);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    message: 'Built-in HTTP server works!', 
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString() 
  }));
});

const PORT = 3002;
const HOST = '127.0.0.1';

server.listen(PORT, HOST, () => {
  console.log(`✅ Built-in HTTP server running on http://${HOST}:${PORT}`);
  console.log('Try: curl http://127.0.0.1:3002/test');
});

server.on('error', (err) => {
  console.error('❌ Server error:', err);
});