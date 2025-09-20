import type { FastifyInstance } from 'fastify';

// Simple in-memory store for SSE connections
const sseConnections = new Map<string, Set<NodeJS.WritableStream>>();

export interface SSEMessage {
  event?: string;
  data: unknown;
  id?: string;
}

export const SSEService = {
  // Add client connection for a video
  addConnection(videoId: string, stream: NodeJS.WritableStream) {
    if (!sseConnections.has(videoId)) {
      sseConnections.set(videoId, new Set());
    }
    sseConnections.get(videoId)!.add(stream);
    
    // Clean up on close
    stream.on('close', () => {
      this.removeConnection(videoId, stream);
    });
  },

  // Remove client connection
  removeConnection(videoId: string, stream: NodeJS.WritableStream) {
    const connections = sseConnections.get(videoId);
    if (connections) {
      connections.delete(stream);
      if (connections.size === 0) {
        sseConnections.delete(videoId);
      }
    }
  },

  // Broadcast message to all clients watching a video
  broadcast(videoId: string, message: SSEMessage) {
    const connections = sseConnections.get(videoId);
    if (!connections || connections.size === 0) return;

    const data = `data: ${JSON.stringify(message.data)}\n`;
    const event = message.event ? `event: ${message.event}\n` : '';
    const id = message.id ? `id: ${message.id}\n` : '';
    const payload = `${event}${id}${data}\n`;

    connections.forEach((stream) => {
      try {
        stream.write(payload);
      } catch (error) {
        console.error('SSE write error:', error);
        this.removeConnection(videoId, stream);
      }
    });
  },

  // Get connection count for a video
  getConnectionCount(videoId: string): number {
    return sseConnections.get(videoId)?.size || 0;
  },
};

export function registerSSERoutes(app: FastifyInstance) {
  // SSE endpoint for real-time video status updates
  app.get('/videos/:id/events', async (req, reply) => {
    const { id } = req.params as { id: string };
    
    // Set SSE headers
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Send initial connection confirmation
    reply.raw.write(`data: {"type": "connected", "videoId": "${id}"}\n\n`);

    // Register connection
    SSEService.addConnection(id, reply.raw);

    // Handle client disconnect
    req.raw.on('close', () => {
      SSEService.removeConnection(id, reply.raw);
    });

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(`data: {"type": "heartbeat", "timestamp": "${new Date().toISOString()}"}\n\n`);
      } catch (error) {
        clearInterval(heartbeat);
        SSEService.removeConnection(id, reply.raw);
      }
    }, 30000); // 30 second heartbeat

    // Clean up on close
    reply.raw.on('close', () => {
      clearInterval(heartbeat);
      SSEService.removeConnection(id, reply.raw);
    });
  });
}