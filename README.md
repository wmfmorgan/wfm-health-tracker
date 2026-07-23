# WFM Health Tracker

Personal, **localhost-only** health chart for chronic care (e.g. ulcerative colitis) and related records.

**Phase 1 = records hub:** structured clinical data + source PDFs on disk.  
**Phase 2 = AI lab import:** extract lab panels from digital PDFs via Grok (cloud) or Ollama (local), review drafts, then commit.  
**Phase 3 = AI co-pilot:** multi-persona chat and Chart Brief evaluation with review-gated memory.

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
- **Settings** — auth status, preferred units, upload limit, backup guidance, AI provider defaults, personas

---

## Phase 2: AI PDF import

Import digital lab PDFs, propose draft lab panels with AI, review and edit, then commit into your records.

- **Import flow** — upload PDF → extract text → AI draft → review UI → commit labs (+ attach PDF)
- **Dual providers**
  - **Ollama** (local, default) — text stays on your machine; requires a running Ollama server
  - **Grok** (xAI cloud) — requires `XAI_API_KEY`; each import asks for explicit cloud confirmation before text is sent
- **Text-layer requirement** — only digital PDFs with a selectable text layer. Scanned/image-only PDFs (OCR) are not supported
- **Settings** — default provider, Grok model, Ollama base URL/model; `XAI_API_KEY` status (yes/no) is shown read-only

Assistive only — not medical advice. Always review drafts before commit.

---

## Phase 3: AI co-pilot & Chart Brief

Evaluate your chart through clinical **personas**, chat with optional persona lenses, and keep accepted views in a multi-persona **Chart Brief**. Nothing from the AI becomes “memory” until you explicitly accept it.

### Co-pilot (`/co-pilot`)

- **Chat** — free-form threads with optional persona lens, provider/model choice (Ollama local or Grok cloud), and chart context scope
- **Evaluate** — run a structured persona evaluation against the chart; result lands as a **draft** view only (not memory)
- Chart context is built from your records (profile, allergies, diagnoses, meds/supplements, labs, tests, procedures, accepted views, My Plan)

### Chart Brief (`/brief`)

- **Multi-persona views** — each persona can have a draft and/or accepted view
- **Review gate** — Evaluate creates drafts; you **accept** (versioned; previous accepted is superseded) or **reject** (draft discarded). Drafts are not used as peer context for later evaluations
- **My Plan** — your own notes alongside persona views
- **Conflicts kept, not auto-merged** — multiple accepted persona views coexist. When two or more current accepted views share topic tags, the UI shows an informational conflict flag (e.g. overlapping notes on meds). Recommendations are never auto-merged

### Personas (Settings → Personas)

Seven built-in lenses (tweakable, not deletable):

| Persona | Focus |
|---------|--------|
| Gastroenterologist | GI / IBD-oriented chart review |
| Primary care / internist | Whole-person primary care |
| Clinical pharmacist | Meds, supplements, interactions |
| Functional / integrative medicine | Root-cause / lifestyle lens |
| Urologist | Urologic conditions and related data |
| PhD Nutritionist | Diet, nutrients, nutrition-relevant labs |
| Cardiologist | Cardiovascular risk, meds, findings |

- **Enable/disable** — disabled personas are hidden from chat and evaluate
- **System prompt override** — tweak any persona; **reset to default** for built-ins
- **Custom personas** — create (name + prompt) and delete; built-ins can only be disabled

### Grok cloud confirm

Using **Grok (xAI)** for chat or evaluate requires an explicit per-request confirmation. The UI shows a rough character/token estimate of the chart payload before anything leaves the machine. **Ollama** stays local and does not require cloud confirm. Set `XAI_API_KEY` in `.env` for Grok (same as Phase 2 import).

### Disclaimers

- Outputs are **assistive only — not medical advice** and not a substitute for clinical care
- Safety rules are always appended server-side to persona prompts
- AI does **not** create or update medications, labs, diagnoses, or other chart records in Phase 3
- Always review drafts before accept; treat opinions separately from chart facts

### Later (not in this ship)

- Med/supplement cross-check skill
- Lab interpretation skill beyond import
- **FR-001** analyte lay explanations (see `docs/superpowers/specs/FUTURE-REQUIREMENTS.md`)
- Plan synthesis across personas

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

### Optional: local Ollama (default import provider)

1. Install and start [Ollama](https://ollama.com).
2. Pull a model (default setting: `llama3.2`), e.g. `ollama pull llama3.2`.
3. Confirm Settings → AI providers: Ollama base URL (default `http://127.0.0.1:11434`) and model name.

### Optional: Grok (cloud)

1. Set `XAI_API_KEY` in `.env` and restart the server.
2. Choose Grok as provider (Settings default or per-import).
3. Confirm the cloud disclosure on each import before extract runs.

---

## Environment variables

Copy from `.env.example`. All are optional unless you enable auth or use Grok.

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_PASSWORD` | _(empty)_ | Passcode for optional lock. Leave empty to disable auth. |
| `SESSION_SECRET` | _(empty)_ | Cookie signing secret (**required** if `APP_PASSWORD` is set; 32+ chars). |
| `DATA_DIR` | `./data` | Directory for SQLite DB + PDF uploads. |
| `MAX_UPLOAD_BYTES` | `26214400` (25 MB) | Max PDF upload size in bytes. |
| `XAI_API_KEY` | _(empty)_ | xAI API key for Grok extract (server-side only). Required when using the Grok provider. |

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
- AI extract + co-pilot: Ollama (local HTTP) and xAI Grok (cloud, opt-in per request)

---

## Out of scope (later)

- Phase 4: encrypted backup export, stronger lock UX
- OCR for scanned PDFs
- Med check, lab interpret skills, FR-001 analyte lay explanations
- Symptom journals, multi-user, mobile apps
