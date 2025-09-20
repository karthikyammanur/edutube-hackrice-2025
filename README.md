# 📚 EduTube Notes

**AI-powered Lecture Companion** – Search, summarize, and quiz yourself on lecture videos in seconds.

🚀 Built at **HackRice 2025**.

---

## 🌟 Overview

EduTube Notes transforms long lecture recordings into **structured, searchable study material**.  
Upload any lecture video, and within minutes you can:

- 🔍 **Search** "When was photosynthesis explained?" → Jump to exact timestamp
- 📝 **Auto-generate notes** from key sections
- ❓ **Generate quizzes & flashcards** to test understanding
- 🎬 **Deep link playback** → resume from the relevant video segment

Powered by **TwelveLabs video AI**, **Gemini LLM**, and a modern **React + Node.js stack**.

---

## 🏗️ Architecture

```
Frontend (React + Vite + Tailwind)
│
▼
Backend (Fastify + TypeScript)
│
┌───────┼────────┐
│       │        │
▼       ▼        ▼
TwelveLabs   Gemini AI   Google Cloud (GCS)
(Video AI)   (Notes/Quiz)  (File Storage)
```

---

## ⚡ Features

- 🎬 **Video Uploads** → Stored in Google Cloud Storage
- 🧠 **TwelveLabs Video Indexing** → Breaks down video into segments with embeddings
- 🔍 **Semantic Search** → Ask natural-language questions about the lecture
- 📝 **Gemini Notes** → Clean, structured study notes
- ❓ **Gemini Quizzes** → Auto-generated questions & flashcards
- 🔄 **Real-time Updates** → Video processing status and content generation

---

## 🔧 Tech Stack

### Frontend

- ⚛️ React 18
- ⚡ Vite + TypeScript
- 🎨 Tailwind CSS
- 🎭 Framer Motion (animations)
- 🎯 Lucide React (icons)

### Backend

- 🚀 Fastify (Node.js, TypeScript)
- 🔒 CORS enabled for cross-origin requests
- 📁 File upload handling

### AI & Cloud

- 🎬 [TwelveLabs](https://twelvelabs.io/) – Video understanding & embeddings
- 🧠 [Gemini API](https://ai.google.dev/) – Notes & quiz generation
- ☁️ Google Cloud Storage – File uploads

---

## 📁 Project Structure

```
hackrice/
├── apps/
│   ├── api/                    # Backend API server
│   │   ├── src/
│   │   │   ├── routes/         # API endpoints
│   │   │   │   ├── search.ts   # Video search functionality
│   │   │   │   ├── videos.ts   # Video management
│   │   │   │   └── webhooks.twelvelabs.ts # TwelveLabs webhooks
│   │   │   ├── services/       # Business logic
│   │   │   │   ├── twelvelabs.ts # TwelveLabs integration
│   │   │   │   ├── gemini.ts   # Gemini AI service
│   │   │   │   └── db.ts       # Database operations
│   │   │   └── index.ts        # Server entry point
│   │   └── package.json
│   └── web/                    # Frontend React app
│       ├── src/
│       │   ├── components/     # React components
│       │   │   ├── animate-ui/ # Animation components
│       │   │   ├── Features.tsx
│       │   │   ├── Hero.tsx
│       │   │   └── ...
│       │   ├── hooks/          # Custom React hooks
│       │   ├── lib/            # Utility functions
│       │   └── main.tsx        # React entry point
│       └── package.json
├── packages/
│   └── types/                  # Shared TypeScript types
│       └── index.ts
└── package.json               # Workspace configuration
```

---

## 📚 API Endpoints

### Core Endpoints

- `GET /health` - Health check
- `POST /videos/upload` - Upload video files
- `GET /videos/:id` - Get video details
- `POST /search` - Search within video content
- `POST /webhooks/twelvelabs` - TwelveLabs webhook handler

### Video Processing Flow

1. **Upload** → Video stored in Google Cloud Storage
2. **Index** → TwelveLabs processes video for searchability
3. **Search** → Query video content using natural language
4. **Generate** → Create notes and quizzes with Gemini AI

---

## 🔍 Key Features Deep Dive

### Video Search

Uses TwelveLabs' video understanding API to enable semantic search across video content. Users can ask questions like "What was discussed about machine learning?" and get timestamped results.

### AI-Generated Content

Leverages Google's Gemini AI to automatically generate:

- Structured study notes from video transcripts
- Quiz questions based on video content
- Flashcards for key concepts

### Real-time Processing

The application provides real-time updates on video processing status through server-sent events, keeping users informed of indexing progress.

---

_Transform your learning experience with AI-powered video analysis._ 🎓✨
