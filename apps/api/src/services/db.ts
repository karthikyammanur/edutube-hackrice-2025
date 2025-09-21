import { Firestore } from '@google-cloud/firestore';
import type { VideoMetadata, VideoSegment } from '@edutube/types';

const VIDEOS_COLLECTION = 'videos';
const SEGMENTS_COLLECTION = 'video_segments';

let firestore: Firestore | null = null;
function getFirestore() {
  if (!firestore) {
    firestore = new Firestore({
      // Uses ADC by default. Ensure GOOGLE_CLOUD_PROJECT is set or credentials are configured.
      projectId: process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT,
      ignoreUndefinedProperties: true,
    } as any);
  }
  return firestore;
}

export const Db = {
  videosCollection: VIDEOS_COLLECTION,
  segmentsCollection: SEGMENTS_COLLECTION,

  async upsertVideo(meta: VideoMetadata): Promise<void> {
    const db = getFirestore();
    const ref = db.collection(VIDEOS_COLLECTION).doc(meta.id);
    await ref.set(meta, { merge: true });
  },

  async getVideo(id: string): Promise<VideoMetadata | null> {
    const db = getFirestore();
    const snap = await db.collection(VIDEOS_COLLECTION).doc(id).get();
    if (!snap.exists) return null;
    return snap.data() as VideoMetadata;
  },

  async listVideos(limit = 50): Promise<VideoMetadata[]> {
    const db = getFirestore();
    const qs = await db.collection(VIDEOS_COLLECTION).orderBy('createdAt', 'desc').limit(limit).get();
    return qs.docs.map((d) => d.data() as VideoMetadata);
  },

  async upsertVideoSegments(segments: VideoSegment[]): Promise<void> {
    const db = getFirestore();
    const batch = db.batch();
    
    for (const segment of segments) {
      const ref = db.collection(SEGMENTS_COLLECTION).doc(segment.id);
      batch.set(ref, segment, { merge: true });
    }
    
    await batch.commit();
  },

  async getVideoSegments(videoId: string): Promise<VideoSegment[]> {
    const db = getFirestore();
    const qs = await db.collection(SEGMENTS_COLLECTION)
      .where('videoId', '==', videoId)
      .orderBy('startSec', 'asc')
      .get();
    return qs.docs.map((d) => d.data() as VideoSegment);
  },

  async deleteVideoSegments(videoId: string): Promise<void> {
    const db = getFirestore();
    const qs = await db.collection(SEGMENTS_COLLECTION).where('videoId', '==', videoId).get();
    const batch = db.batch();
    
    qs.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  },
};
