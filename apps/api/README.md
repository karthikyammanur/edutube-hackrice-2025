# EduTube Notes API (Fastify + TypeScript)

This service provides the backend API built with Fastify. It integrates:
- Firestore (metadata)
- Google Cloud Storage (raw videos, thumbnails)
- TwelveLabs (indexing/search) via a LangChain Retriever
- Gemini API via LangChain

## Prerequisites
- Node.js 18+
- GCP project with Firestore and Cloud Storage
- TwelveLabs API key
- Google Generative AI (Gemini) API key
- Application Default Credentials (ADC) for GCP access

## Environment Variables
- PORT: API port (default 3000)
- HOST: bind host (default 0.0.0.0)
- GOOGLE_CLOUD_PROJECT or GCLOUD_PROJECT: GCP project id
- GCS_BUCKET: Cloud Storage bucket name for assets
- GOOGLE_API_KEY: Google Generative AI (Gemini) API key
- TWELVELABS_API_KEY: TwelveLabs API key
- TWELVELABS_INDEX_ID: Default TwelveLabs index ID (optional)

For local GCP credentials, set up ADC, e.g.:
- gcloud auth application-default login
- Ensure GOOGLE_CLOUD_PROJECT is set.

## Scripts
From the repo root, install once:
- npm install

Run API dev server:
- npm run dev:api

Build and start:
- npm run build:api
- (cd apps/api && npm run start)

## API outline
- GET /health: health check
- POST /videos: create/update metadata
- GET /videos/:id: fetch metadata
- POST /videos/:id/upload-url: generate V4 signed upload URL
- GET /videos/:id/download-url: generate V4 signed download URL
- POST /search: { query, indexId?, videoId?, summarize? }
- GET /export/:id: 501 placeholder
- POST /webhooks/twelvelabs: webhook receiver