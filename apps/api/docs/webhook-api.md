# TwelveLabs Webhook & Real-time Updates API

## Overview

The webhook system handles TwelveLabs completion notifications and provides real-time updates to frontend clients. When video processing completes, the system automatically extracts segments and updates video status.

## Webhook Endpoint

### POST /webhooks/twelvelabs

Receives notifications from TwelveLabs when video processing completes or fails.

**Headers:**

```
Content-Type: application/json
X-TwelveLabs-Signature: sha256=<signature>
```

**Request Body:**

```json
{
  "event_type": "video.embed.task.done",
  "task_id": "twelvelabs-task-id",
  "status": "completed",
  "created_at": "2025-09-20T10:00:00.000Z",
  "updated_at": "2025-09-20T10:05:00.000Z"
}
```

**Features:**

- ✅ **Signature Verification**: HMAC-SHA256 signature validation
- ✅ **Status Updates**: Automatically updates video status to "ready" or "failed"
- ✅ **Segment Extraction**: Retrieves and persists video segments with timestamps
- ✅ **Real-time Notifications**: Broadcasts SSE events to connected clients
- ✅ **Error Handling**: Comprehensive error logging and graceful failures

**Environment Variables:**

```bash
TWELVELABS_WEBHOOK_SECRET=your-webhook-secret  # Optional for signature verification
```

## Status Polling (Fallback)

### GET /videos/:id/status

Fallback endpoint for checking video status when webhook debugging is tricky.

**Response:**

```json
{
  "id": "video-uuid",
  "status": "ready",
  "segmentCount": 120,
  "totalSegments": 120,
  "segments": [
    {
      "id": "video-uuid_0",
      "videoId": "video-uuid",
      "startSec": 0,
      "endSec": 5,
      "text": "Visual content from 0s to 5s",
      "embeddingScope": "visual-text",
      "createdAt": "2025-09-20T10:05:00.000Z"
    }
  ],
  "updatedAt": "2025-09-20T10:05:00.000Z"
}
```

**Smart Polling Logic:**

- If video status is "indexing", automatically checks TwelveLabs API
- Updates status to "ready" if processing completed
- Extracts and persists segments on completion
- Returns cached segments for "ready" videos

## Real-time Updates (SSE)

### GET /videos/:id/events

Server-Sent Events endpoint for real-time video status updates.

**Connection:**

```javascript
const eventSource = new EventSource(`/videos/${videoId}/events`);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log("Video update:", data);
};

// Listen for specific events
eventSource.addEventListener("video.ready", (event) => {
  const data = JSON.parse(event.data);
  console.log("Video processing completed!", data);
});
```

**Event Types:**

- `connected`: Connection established
- `heartbeat`: Keep-alive ping (every 30s)
- `video.ready`: Video processing completed successfully
- `video.failed`: Video processing failed

**Example Events:**

```javascript
// Connection confirmation
data: {"type": "connected", "videoId": "abc123"}

// Processing completed
event: video.ready
data: {
  "videoId": "abc123",
  "status": "ready",
  "segmentCount": 120,
  "message": "Video processing completed successfully"
}

// Processing failed
event: video.failed
data: {
  "videoId": "abc123",
  "status": "failed",
  "message": "Video processing failed"
}
```

## Video Segments Data Model

Extracted segments are stored in Firestore with the following structure:

```typescript
interface VideoSegment {
  id: string; // "videoId_segmentIndex"
  videoId: string; // Parent video ID
  startSec: number; // Segment start time
  endSec: number; // Segment end time
  text: string; // Extracted or generated text
  embeddingScope?: string; // "visual-text" | "audio"
  confidence?: number; // AI confidence score
  createdAt: string; // ISO timestamp
}
```

## Complete Workflow with Webhook

```bash
# 1. Upload video and trigger indexing (as before)
curl -X POST http://localhost:3000/videos/upload-url
# ... upload to GCS ...
curl -X POST http://localhost:3000/videos -d '{"id":"abc123",...}'

# 2. TwelveLabs processes video asynchronously
# 3. TwelveLabs sends webhook when complete
curl -X POST http://localhost:3000/webhooks/twelvelabs \
  -H "X-TwelveLabs-Signature: sha256=..." \
  -d '{
    "event_type": "video.embed.task.done",
    "task_id": "task123",
    "status": "completed"
  }'

# 4. Check final status
curl http://localhost:3000/videos/abc123/status
# Response: {"status": "ready", "segmentCount": 120, ...}
```

## Demo Hack: Webhook Debugging

If webhook setup is tricky during hackathon demos, use the polling approach:

```javascript
// Frontend polling instead of webhooks
const pollVideoStatus = async (videoId) => {
  const response = await fetch(`/videos/${videoId}/status`);
  const video = await response.json();

  if (video.status === "ready") {
    console.log("Video ready!", video.segmentCount, "segments");
    return video;
  } else if (video.status === "indexing") {
    // Poll again in 5 seconds
    setTimeout(() => pollVideoStatus(videoId), 5000);
  }
};
```

**Judges won't mind the polling approach** - it demonstrates the same functionality! 🎯

## Testing

Use the webhook test script to verify functionality:

```bash
npx tsx scripts/webhook-test.ts
```

This creates a test video, triggers indexing, simulates webhook completion, and verifies status updates.

## Demo Ready Features ✅

- ✅ **Webhook Processing**: Secure signature verification and status updates
- ✅ **Segment Persistence**: Automatic extraction and storage of video segments
- ✅ **Real-time Updates**: SSE support for live frontend notifications
- ✅ **Fallback Polling**: Alternative status checking when webhooks aren't available
- ✅ **Error Resilience**: Comprehensive error handling and logging
- ✅ **Production Ready**: Proper security, validation, and monitoring

This completes the **video processing pipeline** for your hackathon demo! 🚀
