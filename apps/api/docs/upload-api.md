# EduTube Video Upload & Indexing API

## Overview

The EduTube API provides endpoints for uploading videos to Google Cloud Storage and triggering TwelveLabs AI indexing for intelligent video search capabilities.

## Workflow

1. **Upload**: Get signed URL → Upload video to GCS
2. **Register**: Trigger TwelveLabs indexing → Video becomes searchable

## Endpoints

### POST /videos/upload-url

Generate a signed upload URL for new video uploads.

**Request Body:**

```json
{
  "fileName": "my-video.mp4",
  "contentType": "video/mp4",
  "ownerId": "user123"
}
```

**Response:**

```json
{
  "videoId": "uuid-generated-id",
  "url": "https://storage.googleapis.com/bucket/signed-upload-url",
  "objectName": "videos/uuid-generated-id/my-video.mp4"
}
```

**Features:**

- Automatically generates unique video ID
- Creates pre-signed GCS upload URL (15min expiry)
- Pre-creates video metadata in Firestore with status "uploaded"
- Returns all info needed for client-side upload

### POST /videos

Kick off TwelveLabs indexing for uploaded videos.

**Request Body:**

```json
{
  "id": "video-uuid-from-upload-url",
  "title": "My Awesome Video",
  "description": "Educational content about...",
  "ownerId": "user123"
}
```

**Response:**

```json
{
  "id": "video-uuid",
  "ownerId": "user123",
  "title": "My Awesome Video",
  "description": "Educational content about...",
  "status": "indexing",
  "gcsObject": "videos/uuid/my-video.mp4",
  "taskId": "twelvelabs-task-id",
  "createdAt": "2025-09-20T10:00:00.000Z",
  "updatedAt": "2025-09-20T10:01:00.000Z",
  "extra": {}
}
```

**Logic:**

- Finds existing video by ID
- If status is "uploaded" and gcsObject exists, triggers TwelveLabs indexing:
  - Generates signed read URL for TwelveLabs
  - Calls TwelveLabs embedding API
  - Updates status to "indexing" with taskId
  - On error: status becomes "failed"

## Video Status States

- **uploaded**: Video file uploaded to GCS, ready for indexing
- **indexing**: TwelveLabs processing in progress
- **ready**: Video indexed and searchable
- **failed**: Error during processing

## Complete Upload Flow

```bash
# 1. Get upload URL
curl -X POST http://localhost:3000/videos/upload-url \
  -H "Content-Type: application/json" \
  -d '{"fileName":"demo.mp4","ownerId":"user123"}'

# Response: { "videoId": "abc123", "url": "signed-url", ... }

# 2. Upload video to GCS (client-side)
curl -X PUT "signed-upload-url" \
  --data-binary @video.mp4 \
  -H "Content-Type: video/mp4"

# 3. Trigger indexing
curl -X POST http://localhost:3000/videos \
  -H "Content-Type: application/json" \
  -d '{"id":"abc123","title":"My Video","description":"..."}'

# Response: { "id": "abc123", "status": "indexing", "taskId": "...", ... }
```

## Environment Variables Required

```bash
# TwelveLabs Integration
TWELVELABS_API_KEY=your-api-key

# Google Cloud Storage
GCS_BUCKET=your-bucket-name
GOOGLE_CLOUD_PROJECT=your-project-id

# Firestore will use ADC (Application Default Credentials)
```

## Demo Ready Features ✅

- ✅ **Video Upload**: Generate signed URLs for direct GCS uploads
- ✅ **Metadata Storage**: Firestore integration with video documents
- ✅ **TwelveLabs Integration**: Automatic indexing trigger with embedding API
- ✅ **Status Tracking**: uploaded → indexing → ready progression
- ✅ **Error Handling**: Failed uploads marked with error details
- ✅ **TypeScript Support**: Full type safety with @edutube/types

This provides a complete **Demo-ready piece #1** for hackathon presentations! 🎯
