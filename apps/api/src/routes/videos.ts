import type { FastifyInstance } from 'fastify';
import { Gcs } from '../services/storage.js';
import { Db } from '../services/db.js';
import type { VideoMetadata } from '@edutube/types';

export async function registerVideoRoutes(app: FastifyInstance) {
  // Create or update video metadata
  app.post('/videos', async (req, reply) => {
    const body = (req.body || {}) as Partial<VideoMetadata> & { id?: string };
    if (!body.id) return reply.code(400).send({ error: 'id is required' });
    const now = new Date().toISOString();
    const meta: VideoMetadata = {
      id: body.id,
      title: body.title || 'Untitled',
      description: body.description,
      status: body.status || 'uploaded',
      gcsUri: body.gcsUri,
      thumbnailGcsUri: body.thumbnailGcsUri,
      durationSec: body.durationSec,
      createdAt: body.createdAt || now,
      updatedAt: now,
      extra: body.extra ?? {},
    };
    await Db.upsertVideo(meta);
    return reply.code(201).send(meta);
  });

  // Fetch one video metadata
  app.get('/videos/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const meta = await Db.getVideo(id);
    if (!meta) return reply.code(404).send({ error: 'Not found' });
    return reply.send(meta);
  });

  // Signed upload URL
  app.post('/videos/:id/upload-url', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body || {}) as { fileName?: string; contentType?: string };
    const fileName = body.fileName || 'video.mp4';
    const contentType = body.contentType || 'video/mp4';
    const objectName = Gcs.objectPath('raw', id, fileName);
    const url = await Gcs.generateV4UploadSignedUrl(objectName, contentType);
    return reply.send({ url, objectName });
  });

  // Signed download URL (thumbnail or raw)
  app.get('/videos/:id/download-url', async (req, reply) => {
    const { id } = req.params as { id: string };
    const q = req.query as { kind?: 'raw' | 'thumb' | 'derived'; fileName?: string };
    const objectName = Gcs.objectPath(q.kind || 'raw', id, q.fileName || 'video.mp4');
    const url = await Gcs.generateV4DownloadSignedUrl(objectName);
    return reply.send({ url, objectName });
  });
}
