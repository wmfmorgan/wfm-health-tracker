# WFM Health Tracker

Personal, **localhost-only** health chart for chronic care (e.g. ulcerative colitis) and related records.

**Phase 1 = records hub:** structured clinical data + source PDFs on disk. No AI, no multi-user, no cloud.

Your data lives under `data/` (SQLite + uploads). Backup = copy that folder.

> **Local only:** The app binds to `127.0.0.1` by default. Do not expose it to the network without understanding the privacy implications — this is personal health data (PHI).

---

## Phase 1 features

- **Profile** — display name, DOB (age derived), sex, height/weight with units, blood type, notes
- **Allergies** — structured list (name, severity, reaction, notes)
- **Diagnoses** — CRUD with status, ICD code, dates, clinician/facility
- **Medications** — CRUD including PRN, dose/route/frequency, start/end, status
- **Supplements** — same shape as medications (separate entity)
- **Labs** — panels + multi-row results (analyte, value, unit, ref range, flag)
- **Tests** — imaging / pathology / other clinical tests
- **Procedures** — procedures with outcomes and follow-up notes
- **Documents** — PDF upload, link to any record, open/download, library view
- **Dashboard** — counts and recent activity
- **Global search** — find records across entity types
- **Optional passcode** — lock app + file routes via `APP_PASSWORD`
- **Settings** — auth status, preferred units, upload limit, backup guidance
- **AI providers** — stub only (Phase 3)

---

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000).

For a production-style local run:

```bash
npm run build
npm start
```

Both `dev` and `start` bind **`127.0.0.1:3000`** only.

---

## Environment variables

Copy from `.env.example`. All are optional unless you enable auth.

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_PASSWORD` | _(empty)_ | Passcode for optional lock. Leave empty to disable auth. |
| `SESSION_SECRET` | _(empty)_ | Cookie signing secret (**required** if `APP_PASSWORD` is set; 32+ chars). |
| `DATA_DIR` | `./data` | Directory for SQLite DB + PDF uploads. |
| `MAX_UPLOAD_BYTES` | `26214400` (25 MB) | Max PDF upload size in bytes. |

Generate a session secret:

```bash
openssl rand -hex 32
```

---

## Enable passcode auth

1. In `.env`, set `APP_PASSWORD` to your passcode.
2. Set `SESSION_SECRET` to a random 32+ character string (`openssl rand -hex 32`).
3. Restart the server (`npm run dev` or `npm start`).
4. Visit the app — you will be redirected to `/login`.
5. Document file routes (`/api/documents/...`) are also protected when auth is on.

To disable auth again, clear `APP_PASSWORD` and restart.

---

## Backup & restore

Everything you need is under the data directory (default `./data`):

- `health.sqlite` — structured records
- `uploads/` — source PDFs

**Backup:**

```bash
cp -R ./data ~/Backups/wfm-health-$(date +%Y%m%d)
```

**Restore:** replace `./data` (or your `DATA_DIR`) with a backup copy and restart the app.

Keep backups offline or encrypted if they leave this machine.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server on `127.0.0.1:3000` |
| `npm run build` | Production build |
| `npm start` | Production server on `127.0.0.1:3000` |
| `npm test` | Run Vitest suite once |
| `npm run test:watch` | Vitest watch mode |
| `npm run lint` | ESLint (Next.js config) |
| `npm run db:migrate` | Apply SQLite migrations |
| `npm run db:generate` | Generate Drizzle migrations |

---

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind
- SQLite via better-sqlite3 + Drizzle ORM
- Server Actions for forms; API routes for PDF upload/download
- Optional auth via iron-session

---

## Out of scope (later phases)

- Phase 2: AI PDF extraction → review → commit
- Phase 3: AI co-pilot (Grok + Ollama), med/lab interpretation
- Phase 4: encrypted backup export, stronger lock UX
- Symptom journals, multi-user, mobile apps
