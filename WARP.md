# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

EduTube Notes is a Node/TypeScript monorepo with separate frontend and backend apps plus shared packages. Use npm workspaces from the repo root.

- Monorepo layout: apps/api (backend), apps/web (frontend), packages/ui and packages/types (shared), infra/cloudrun (deployment scaffolding)
- Tooling: npm workspaces, TypeScript (root tsconfig with path aliases), Vite for the web app, tsc for the API

Common commands

- Install dependencies (workspace-aware)
```bash path=null start=null
npm install
```

- Start dev servers (run in two terminals)
```bash path=null start=null
npm run dev:api
```
```bash path=null start=null
npm run dev:web
```

- Build all
```bash path=null start=null
npm run build
```

- App-specific builds and runs
```bash path=null start=null
# Frontend build and preview
npm run build:web
(cd apps/web && npm run preview)

# Backend build and start
npm run build:api
(cd apps/api && npm run start)
```

- Lint (frontend only, from repo root or app dir)
```bash path=null start=null
(cd apps/web && npm run lint)
```

- Tests
No test runner is configured at this time; there are no test scripts in package.json.

Architecture and code structure

- Workspaces and shared code
  - Root package.json defines npm workspaces: apps/* and packages/*.
  - Root tsconfig.json sets path aliases:
    - @edutube/ui -> packages/ui
    - @edutube/types -> packages/types
  - packages/types: shared TypeScript types.
  - packages/ui: shared UI components (intended for the frontend).

- Frontend (apps/web)
  - Vite + TypeScript app. Build uses tsc then vite build; preview via vite preview.
  - Source layout under src/: pages, components, lib. The root tsconfig sets jsx to react-jsx; components/pages are scaffolded.
  - Scripts (apps/web/package.json): dev, build, lint, preview.

- Backend (apps/api)
  - TypeScript API service. Dev uses tsx watch src/index.ts; production build via tsc to dist/ and start with node dist/index.js.
  - Source layout under src/: index.ts (entry), routes/ (search, videos, export, webhooks.twelvelabs), services/ (auth, db, gemini, notes, storage, twelvelabs). Files are scaffolded for future implementation.

- Infra (infra/cloudrun)
  - Placeholder for Cloud Run deployment configuration. No concrete deployment scripts or configs provided yet.

Notes for operating in this repo

- Prefer running commands from the repo root to leverage npm workspaces (e.g., npm install, npm run build).
- For local development, run the API and Web dev servers in parallel (two Warp panes/tabs) using the dev:api and dev:web scripts.
- Path aliases (@edutube/ui, @edutube/types) are resolved via the root tsconfig.json; import from these instead of relative paths across apps.

Environment

- API requires these env vars (set in your shell or a process manager):
  - GOOGLE_CLOUD_PROJECT (or GCLOUD_PROJECT)
  - GCS_BUCKET
  - GOOGLE_API_KEY (Gemini)
  - TWELVELABS_API_KEY
  - TWELVELABS_INDEX_ID (optional default)
- Use GCP Application Default Credentials for Firestore/Storage access (e.g., run `gcloud auth application-default login`).
