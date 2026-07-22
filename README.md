# WFM Health Tracker

Personal local health chart for UC / chronic care (Phase 1).

Runs as a localhost-only Next.js app. Your records live on disk under `data/` (SQLite + uploads). Backup is a copy of that folder.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on `127.0.0.1:3000` |
| `npm run build` | Production build |
| `npm start` | Production server on `127.0.0.1:3000` |
| `npm test` | Run tests once |
| `npm run test:watch` | Vitest watch mode |

## Data & backup

- Default data directory: `./data` (override with `DATA_DIR` in `.env`)
- To back up: copy the entire `data/` directory
- Auth is optional: leave `APP_PASSWORD` empty to disable the passcode lock

## Environment

See `.env.example` for `APP_PASSWORD`, `SESSION_SECRET`, `DATA_DIR`, and `MAX_UPLOAD_BYTES`.
