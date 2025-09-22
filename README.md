# EduTube

AI-powered lecture companion for searching, summarizing, and quizzing yourself on lecture videos.

Built at HackRice 2025 by Karthik Yammanur, Shaheem Jaleel, Hrishikesh Naveenam, Magnus Graham.

## Live Demo
[![Live Demo](https://img.youtube.com/vi/-R1D8gmRfco/maxresdefault.jpg)](https://www.youtube.com/watch?v=-R1D8gmRfco)

## What it does

Upload any lecture video and get:
- Semantic search through video content
- Auto-generated study notes
- Quiz questions and flashcards
- Jump to exact timestamps

## Tech Stack

**Frontend:** React, Vite, TypeScript, Tailwind CSS  
**Backend:** Fastify, Node.js, TypeScript  
**AI:** TwelveLabs (video understanding), Gemini (content generation)  
**Storage:** Google Cloud Storage

## Architecture
React Frontend → Fastify API → TwelveLabs + Gemini + Google Cloud

## API Endpoints

- `POST /videos/upload` - Upload videos
- `GET /videos/:id` - Get video details  
- `POST /search` - Search video content
- `POST /webhooks/twelvelabs` - Processing webhooks

## Project Structure
hackrice/
├── apps/
│   ├── api/           # Backend server
│   └── web/           # React frontend
└── packages/
└── types/         # Shared types

## How it works

1. Upload lecture video → stored in Google Cloud
2. TwelveLabs indexes video content
3. Search with natural language queries
4. Gemini generates notes and quizzes
5. Real-time updates on processing status

Simple, effective study tool powered by modern AI.
