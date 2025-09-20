import { Firestore } from '@google-cloud/firestore';
import type { VideoMetadata } from '@edutube/types';

const COLLECTION = 'videos';

let firestore: Firestore | null = null;
function getFirestore() {
  if (!firestore) {
    firestore = new Firestore({
      // Uses ADC by default. Ensure GOOGLE_CLOUD_PROJECT is set or credentials are configured.
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
    });
  }
  return firestore;
}

export const Db = {
  collectionName: COLLECTION,

  async upsertVideo(meta: VideoMetadata): Promise<void> {
    const db = getFirestore();
    const ref = db.collection(COLLECTION).doc(meta.id);
    await ref.set(meta, { merge: true });
  },

  async getVideo(id: string): Promise<VideoMetadata | null> {
    const db = getFirestore();
    const snap = await db.collection(COLLECTION).doc(id).get();
    if (!snap.exists) return null;
    return snap.data() as VideoMetadata;
  },

  async listVideos(limit = 50): Promise<VideoMetadata[]> {
    const db = getFirestore();
    const qs = await db.collection(COLLECTION).orderBy('createdAt', 'desc').limit(limit).get();
    return qs.docs.map((d) => d.data() as VideoMetadata);
  },
};
