# WFM Health Tracker — Design Spec

**Date:** 2026-07-22  
**Status:** Approved for implementation planning  
**Audience:** Solo developer (personal use)

## 1. Purpose

Personal, **locally hosted** health chart for managing chronic illness (ulcerative colitis) and aging-related medical issues. Single user. Goal: one place for diagnoses, labs, medications, test results, procedures, supplements, baseline profile, and **source PDFs**.

AI (xAI Grok + local models via Ollama) will later help interpret results, cross-check meds/supplements, and extract data from PDFs. **v1 is a records hub** — structured data and source documents first; AI is designed for but not required in the first ship.

### 1.1 Goals

- Maintain a trustworthy personal medical chart offline-capable on this machine.
- Manual entry of all core clinical entities plus optional source PDF attachment.
- Same document store used later when AI scans PDFs (source file always retained and linked).
- Practical local privacy: localhost-only, optional passcode, no multi-tenant cloud product.

### 1.2 Non-goals (v1)

- Multi-user / multi-patient / telehealth / provider portal.
- Daily symptom, stool, or flare journaling (future phase).
- Full vitals time series beyond current weight on profile.
- AI chat, med cross-check, or automated PDF extraction (phases 2–3).
- Mobile-native apps (browser on localhost is enough; LAN optional later).
- HIPAA compliance product claims (personal tool; still treat data as sensitive PHI).

### 1.3 Success criteria (records hub)

- Profile + structured allergies maintained.
- Full CRUD for diagnoses, medications, supplements, lab panels/results, tests, procedures.
- Attach, open, and download source PDFs; Documents library lists all files and links.
- Optional passcode gate works for app and file routes.
- Copying `data/` backs up structured data and PDFs completely.

---

## 2. Key decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Form factor | Local web app (`localhost`) | Best fit for tables, forms, PDF workflows; simple ops |
| Architecture | Modular monolith (Next.js) | One process, clear modules, easy backup |
| Stack | TypeScript, Next.js App Router, SQLite, Drizzle | One language; solid UI + local DB |
| MVP scope | Records hub + profile + source PDFs | Chart must be trustworthy before AI |
| Security | Practical local: bind `127.0.0.1`, optional passcode | Balance daily use vs PHI protection |
| Documents | First-class in v1; shared by manual + future AI | Source of truth files always retained |
| AI (later) | Dual provider, user-selectable (Grok + Ollama) | Privacy/cost control; offline local path |
| Symptoms/vitals journal | Out of v1 | Keeps first ship focused |

---

## 3. System architecture

Single **Next.js (App Router) + TypeScript** application serving UI and API in one process.

```
Browser (you)
    │ HTTP → 127.0.0.1
    ▼
Next.js app
  ├── App Router (React UI)
  ├── Server Actions (forms) + API routes (file upload/download)
  ├── Domain services (pure TS orchestration)
  ├── Drizzle + SQLite
  └── (later) Documents extract pipeline · AI provider router
         │
         ▼
    data/health.sqlite
    data/uploads/          # PDF binaries
```

### 3.1 Runtime

- **Dev:** `npm run dev`, bind localhost only.
- **Local “prod”:** `npm start` or process manager; default bind `127.0.0.1`.
- **Secrets:** gitignored `.env` (optional app password hash/secret, later `XAI_API_KEY`).
- **Backup unit:** entire `data/` directory (SQLite + uploads).

### 3.2 Security (practical local)

- Listen on `127.0.0.1` only by default (not `0.0.0.0`).
- Optional single passcode/password; httpOnly session cookie.
- No multi-user accounts.
- `.env` and `data/` gitignored.
- No analytics or third-party trackers in v1.
- Logs prefer action + entity ids; avoid dumping lab values/notes.
- Cloud AI only when user selects Grok and the feature is enabled (phase 3+).

### 3.3 Phase map

| Phase | Scope |
|-------|--------|
| **1 – Records hub** | Profile, allergies, clinical CRUD, document upload/storage/linking, optional passcode, dashboard, search |
| **2 – AI PDF import** | Extract → review/edit/accept drafts → commit records already linked to source PDF |
| **3 – AI co-pilot** | Chat, med/supplement cross-check, lab interpretation; provider router (xAI Grok + Ollama) |
| **4 – Hardening** | Encrypted backup export, stronger lock UX, clearer audit of any data sent to cloud |

---

## 4. Data model

Single implicit patient (no multi-patient tables). All clinical entities share metadata: `id`, `created_at`, `updated_at`, optional `notes`, optional `source` (`manual` | `pdf_import`).

### 4.1 Profile

| Field | Notes |
|-------|--------|
| display_name | Optional |
| date_of_birth | Age derived at display time |
| sex | Free text or constrained enum (implementation choice) |
| height_value, height_unit | cm / in |
| weight_value, weight_unit | kg / lb; **current** snapshot only in v1 |
| blood_type | Optional |
| notes | Free text |
| updated_at | |

### 4.2 Allergies (structured)

- name, reaction, severity (optional), notes  
- Structured so future med checks can use them.

### 4.3 Diagnoses

- name, status (`active` \| `resolved` \| `chronic`), diagnosed_on, icd_code (optional), clinician/facility (optional), notes

### 4.4 Medications

- name, dose, form, route, frequency, start_on, end_on (nullable = ongoing), status (`active` \| `stopped`), purpose (optional), prescriber (optional), prn flag or frequency text, notes

### 4.5 Supplements

- Same shape as medications (separate entity for clear drug-vs-supplement AI later).

### 4.6 Lab panels and results

- **LabPanel:** name, collected_on, facility (optional), status, notes  
- **LabResult:** panel_id, analyte_name, value, unit, ref_low, ref_high, flag (`normal` \| `H` \| `L` \| `critical` \| etc.), notes  
- One panel → many results (normalized rows, not a single JSON blob).

### 4.7 Tests (imaging / pathology / other)

- type, name, performed_on, facility (optional), summary/impression, key findings (text), notes

### 4.8 Procedures

- name, performed_on, facility/clinician (optional), outcome/findings, follow_up notes

### 4.9 Documents (source files)

| Field | Notes |
|-------|--------|
| id, created_at | |
| original_filename | User-facing name |
| content_type | e.g. `application/pdf` |
| storage_path | Under `data/uploads/` (UUID or content-addressed name on disk) |
| byte_size, checksum | Integrity / optional dedupe |
| title / description | Optional |
| uploaded_via | `manual` \| `ai_import` |
| notes | Optional |

**Links:** many-to-many between documents and clinical entities (diagnoses, medications, supplements, lab panels, tests, procedures). Lab results inherit panel-level documents in v1.

**Rules:**

- Manual entry and AI import share this store.
- AI never discards the PDF; accepted extractions link to the same document id.
- Delete clinical record → **unlink** documents by default; file remains until deleted from Documents library.
- Delete document → remove file + metadata + all links (with UI confirm).

### 4.10 Relationships (v1)

```
Profile (1)
Allergies (0..n)

Diagnoses | Medications | Supplements | LabPanels | Tests | Procedures
LabPanel 1──* LabResult
Document *──* (clinical entities above)
```

Optional later: meds ↔ diagnoses, labs ↔ procedures (nullable FKs without redesign).

### 4.11 Out of v1 model

- Symptom / flare / stool journals  
- Vitals time series (beyond profile weight)  
- AI chat history (add in phase 3)  
- Extraction draft tables (add in phase 2)

---

## 5. Application structure

### 5.1 Routes (v1)

| Route | Purpose |
|-------|---------|
| `/` | Dashboard |
| `/profile` | Profile + allergies |
| `/diagnoses`, `/diagnoses/[id]` | List / detail |
| `/medications`, `/medications/[id]` | List / detail (default filter: active) |
| `/supplements`, `/supplements/[id]` | List / detail (default filter: active) |
| `/labs`, `/labs/[id]` | Panels + results |
| `/tests`, `/tests/[id]` | Tests |
| `/procedures`, `/procedures/[id]` | Procedures |
| `/documents` | PDF library |
| `/settings` | Passcode, units, backup guidance; AI settings stub |
| `/login` | When passcode enabled |

Layout: sidebar nav + main content. Dense, clinical UI — tables for lists.

### 5.2 Code layout

```
src/
  app/                 # Next.js routes (UI)
  app/api/             # File upload/download and similar
  components/
    ui/                # Primitives
    records/           # Lists, forms, attachments
    layout/            # Shell, nav, dashboard
  server/
    db/                # Drizzle schema, client, migrations
    services/          # Domain services
    auth/              # Optional passcode session
  lib/                 # Types, units, zod schemas
data/
  health.sqlite
  uploads/
```

**Boundary rule:** Domain logic in `server/services`. UI does not touch SQL directly.

**Interaction style:**

- **Server Actions** for form create/update/delete.
- **Route handlers** for multipart upload and file download (`/api/documents/[id]/file`).

### 5.3 Shared UI building blocks

1. **EntityList** — table, filters, search, Add  
2. **EntityForm** — create/edit + zod validation  
3. **EntityDetail** — read/edit + AttachmentsPanel  
4. **AttachmentsPanel** — upload PDF, list, open/download, unlink  
5. **LabResultsEditor** — panel + result rows  
6. **DashboardWidgets** — profile snapshot, active counts, recent labs  

### 5.4 Document handling (v1)

- Primary type: **PDF** (reject or hard-warn other types).  
- Store binaries outside SQLite; DB holds metadata + links.  
- Max size via env/settings (suggested default 25–50 MB).  
- Serve files only through session-aware API routes.

---

## 6. Data flows

### 6.1 Manual clinical entry

1. User submits form → zod validate.  
2. Service writes entity (and lab results) in a **transaction**.  
3. Optional PDF: write under `data/uploads/` → Document row → link row(s).  
4. Show detail with sources listed.

### 6.2 Attach PDF to existing record

1. Upload from AttachmentsPanel.  
2. Persist file + Document + link.  
3. Open via `/api/documents/[id]/file`.

### 6.3 AI PDF import (phase 2 — designed now)

1. Upload PDF → Document (`uploaded_via=ai_import`).  
2. Extract text → Grok or Ollama.  
3. Produce **draft** proposed entities (not committed).  
4. User review: accept / edit / reject each.  
5. On accept: write entities + link **same** Document id.

### 6.4 AI co-pilot (phase 3 — designed now)

1. User question + optional scope (e.g. active meds + recent labs).  
2. Load structured context from DB.  
3. Provider router → Grok or Ollama.  
4. Stream answer; optional citations to record ids / documents.  
5. UI copy: decision support only, not medical advice.

### 6.5 Backup (v1)

- Document that backing up = copying `data/`.  
- Phase 4: optional zip + password-encrypted export.

### 6.6 Auth gate

When passcode enabled: unauthenticated requests → `/login` → httpOnly session → access UI and file routes.

---

## 7. AI architecture (phases 2–3)

### 7.1 Provider router

- Abstraction: `AIProvider` with implementations for **xAI Grok** (`XAI_API_KEY`, OpenAI-compatible API at `https://api.x.ai/v1`) and **Ollama** (local HTTP).  
- Settings: default provider/model per task type (extract, chat, med_check).  
- Offline or missing key → local only; clear errors if chosen provider unavailable.

### 7.2 Privacy

- User controls when cloud is used.  
- Prefer sending minimal structured context, not entire PDF corpus, for chat.  
- Extraction may send PDF text/pages to chosen provider — disclose in UI before send.

### 7.3 Safety

- All AI outputs labeled as assistive, not medical advice.  
- Extraction commits only after explicit user acceptance.

---

## 8. Error handling

| Situation | Behavior |
|-----------|----------|
| Validation failure | Field errors; no write |
| Non-PDF / too large | Clear error; no partial Document |
| Disk failure mid-upload | No DB row without file (temp write + rename, or file-then-metadata ordering) |
| Unexpected server error | Generic UI message; limited PHI in logs |
| Missing file on disk | “File missing”; offer cleanup of metadata |
| Bad passcode | Generic invalid; light rate limit |
| AI provider down | Fail action; keep draft recoverable |

---

## 9. Testing strategy

| Layer | Scope |
|-------|--------|
| Unit | Zod schemas, units, lab flag helpers, pure service helpers |
| Integration | Services + temp SQLite: panel+results transaction, attach/unlink/delete document |
| API | Upload accept/reject; auth on file download |
| E2E | Optional Playwright smoke after UI stabilizes |
| Manual UAT | Personal checklist against real (or sanitized) chart samples |

**v1 bar:** unit + integration solid; E2E optional.

---

## 10. Implementation stack (concrete)

| Concern | Choice |
|---------|--------|
| Framework | Next.js (App Router), TypeScript |
| DB | SQLite via better-sqlite3 or libsql-compatible driver |
| ORM | Drizzle ORM + migrations |
| Validation | Zod |
| UI | React; accessible form controls; simple CSS or Tailwind |
| Auth | Optional iron-session / sealed cookie + scrypt/bcrypt passcode hash |
| Files | Local filesystem under `data/uploads/` |
| AI (later) | `openai` SDK pointed at xAI; Ollama HTTP API |

Exact package versions chosen at implementation time.

---

## 11. Open questions (resolved in discussion)

| Topic | Resolution |
|-------|------------|
| Form factor | Local web app |
| MVP focus | Records hub first |
| Security level | Practical local |
| Stack | TypeScript full-stack Next.js + SQLite |
| Symptom journal in v1 | No |
| Profile | Yes (height, weight, DOB/age, etc.) + allergies |
| AI posture | Dual provider, user-selectable |
| Architecture style | Modular monolith |
| Source PDFs in v1 | Yes, attach on manual entry; AI reuses same store |

**Deferred (not blocking design):** preferred UI kit (e.g. shadcn), exact sex/gender field wording, metric vs imperial default, max upload size number.

---

## 12. PR / delivery plan (incremental)

Suggested merge order for phase 1:

1. **Scaffold** — Next.js app, tooling, gitignore for `data/` and `.env`, README run instructions.  
2. **Database foundation** — Drizzle schema for all v1 entities + migrations + DB client.  
3. **Profile + allergies** — UI + services.  
4. **Diagnoses / meds / supplements CRUD** — list, detail, forms.  
5. **Labs (panel + results)** — transactional create/update.  
6. **Tests + procedures CRUD.**  
7. **Documents** — upload, storage, link UI, download route, documents library.  
8. **Dashboard + global search.**  
9. **Optional passcode auth** + lock file routes.  
10. **Polish** — settings (units), empty states, backup docs in README.

Phases 2–4 follow as separate milestones after UAT of phase 1.

---

## 13. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| PHI on disk / backups | Localhost bind; gitignore data; clear backup instructions; optional encrypt later |
| Accidental cloud leak via AI | Dual provider defaults; explicit provider choice; UI disclosure |
| Partial lab writes | Transactions |
| Orphan or missing files | Ordered write; checksum; cleanup UX |
| Scope creep into symptoms/AI | Phase map; this spec’s non-goals |

---

## 14. Next step

Create an implementation plan from this spec (writing-plans / phased tasks), then execute phase 1 (records hub + source PDFs).
