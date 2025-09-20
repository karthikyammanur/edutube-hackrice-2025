import { Storage } from '@google-cloud/storage';
import fs from 'node:fs';

// If GOOGLE_APPLICATION_CREDENTIALS or GCS_CREDENTIALS points to a non-existent file,
// drop it to allow Application Default Credentials (ADC) fallback.
(() => {
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GCS_CREDENTIALS;
  if (credPath && !fs.existsSync(credPath)) {
    console.warn(`Credential path set but not found at "${credPath}". Falling back to ADC (gcloud).`);
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }
})();

const storage = new Storage({
  projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
});

const BUCKET = process.env.GCS_BUCKET as string;
if (!BUCKET) {
  // Don't throw at import time to allow building, but warn at runtime.
  console.warn('GCS_BUCKET env var is not set. Signed URL generation will fail.');
}

export const Gcs = {
  bucketName: () => BUCKET,

  objectPath(kind: 'raw' | 'thumb' | 'derived', videoId: string, fileName: string) {
    const prefix = kind === 'raw' ? 'videos' : kind === 'thumb' ? 'thumbnails' : 'derived';
    return `${prefix}/${videoId}/${fileName}`;
  },

  async generateV4UploadSignedUrl(objectName: string, contentType: string, expiresInSeconds = 15 * 60) {
    if (!BUCKET) throw new Error('GCS_BUCKET not configured');
    const options = {
      version: 'v4' as const,
      action: 'write' as const,
      expires: Date.now() + expiresInSeconds * 1000,
      contentType,
    };
    const [url] = await storage.bucket(BUCKET).file(objectName).getSignedUrl(options);
    return url;
  },

  async generateV4DownloadSignedUrl(objectName: string, expiresInSeconds = 60 * 60) {
    if (!BUCKET) throw new Error('GCS_BUCKET not configured');
    const options = {
      version: 'v4' as const,
      action: 'read' as const,
      expires: Date.now() + expiresInSeconds * 1000,
    };
    const [url] = await storage.bucket(BUCKET).file(objectName).getSignedUrl(options);
    return url;
  },
};
