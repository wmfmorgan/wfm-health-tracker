# WFM Health Tracker — Phase 2 Design: AI Lab PDF Import

**Date:** 2026-07-22  
**Status:** Approved for implementation planning  
**Parent:** [`2026-07-22-wfm-health-tracker-design.md`](./2026-07-22-wfm-health-tracker-design.md)  
**Audience:** Solo developer (personal use)

## 1. Purpose

Add **AI-assisted lab PDF import**: upload a PDF, extract its text layer, ask a user-selected AI provider (xAI Grok or local Ollama) to propose lab panel/result drafts, review and edit those drafts, then **explicitly accept** into the existing records hub with the source PDF linked.

Phase 2 does **not** add chat, med cross-check, OCR, or non-lab entity extraction.

### 1.1 Goals

- Turn digital lab PDFs into structured lab panels/results faster than pure manual entry.
- Keep the source PDF as the document of record (same `documents` store as Phase 1).
- Never commit clinical data without user acceptance.
- Support dual AI providers with clear privacy disclosure for cloud.

### 1.2 Non-goals

- OCR / scanned-image PDFs (text layer required; clear failure message).
- Extracting diagnoses, medications, supplements, tests, or procedures.
- AI chat, lab interpretation co-pilot, or FR-001 analyte lay explanations (Phase 3).
- Encrypted backup hardening (Phase 4).
- Multi-user or multi-tenant import queues.

### 1.3 Success criteria

1. User can start an import from a dedicated **Import** page, choose Grok or Ollama, and upload a PDF.
2. Empty/missing text layer fails the job with a scan-oriented message (no silent empty success).
3. Grok path requires **per-import cloud confirm** showing filename and approximate character count.
4. Multi-panel PDFs produce 0..n draft panels with editable result rows.
5. Accept writes real `lab_panels` + `lab_results` with `source=pdf_import`, links the Document, and marks the draft accepted.
6. Reject/discard never creates clinical rows; Document remains in the library unless user deletes it separately.
7. Jobs and drafts persist across browser close and app restart.
8. Unit + integration tests cover draft lifecycle and accept/link without live AI network calls.

---

## 2. Decisions (locked in design discussion)

| Topic | Choice |
|-------|--------|
| Extraction scope | Labs only (panels + results) |
| AI providers | Dual: Grok (xAI) + Ollama, user-selectable |
| Entry point | Dedicated Import page (sidebar) |
| PDF handling | Text layer only; fail if insufficient text |
| Multi-panel | Allowed (0..n panels per job) |
| Draft storage | Persisted SQLite: job + normalized draft tables |
| Cloud disclosure | Confirm each Grok import before send |
| Architecture style | Import job + `draft_lab_panels` / `draft_lab_results` (not soft-draft on live labs) |

---

## 3. Architecture

### 3.1 Pipeline

```
Browser
  │
  ▼
/import/new  →  upload PDF  →  Document (uploaded_via=ai_import)
  │
  ▼
ImportJob (pending)
  │
  ├─ extract text (local pdf parser)
  │     └─ insufficient text → failed
  │
  ├─ provider=grok → status=awaiting_cloud_confirm
  │     └─ user confirms → extracting
  │
  ├─ provider=ollama → extracting (no cloud confirm)
  │
  ▼
AIProvider.completeJson(extract prompt + text)
  │
  ├─ Zod validate (optional one repair retry)
  │
  ▼
DraftLabPanel + DraftLabResult rows
  status=ready
  │
  ▼
/import/[id] review → Accept / Edit / Reject per panel
  │
  Accept → transaction:
    create lab_panel + lab_results (source=pdf_import)
    document_links (document → lab_panel)
    draft.review_status=accepted, committed_entity_id=…
  │
  When no pending drafts left → job completed
```

### 3.2 Modules

| Module | Responsibility |
|--------|----------------|
| `src/lib/pdf-text.ts` | Text-layer extraction; empty/short text detection |
| `src/server/ai/types.ts` | `AIProvider` interface |
| `src/server/ai/grok.ts` | xAI OpenAI-compatible client (`XAI_API_KEY`, `https://api.x.ai/v1`) |
| `src/server/ai/ollama.ts` | Local Ollama HTTP client |
| `src/server/ai/router.ts` | Resolve provider from settings + job |
| `src/server/ai/extract-labs.ts` | Prompt + schema + call + validate + optional repair |
| `src/server/services/imports.ts` | Job lifecycle, draft CRUD, accept/reject/discard |
| `src/app/(app)/import/*` | List, new, detail/review UI |
| Settings page | AI defaults (provider, models, Ollama base URL); key presence only |

**Boundary rules (unchanged):** UI and Server Actions call services; services own DB writes. AI HTTP stays server-side only.

### 3.3 Runtime notes

- Extraction runs **in-process** (server action or route handler) for this personal app; job row tracks status so the user can refresh and resume.
- If the process dies mid-extract, job may stick in `extracting`; UI offers **Retry** / **Mark failed**.
- Do not log full extracted text or lab values; log job id + status + error class.

---

## 4. Data model

### 4.1 `import_jobs`

| Field | Notes |
|-------|--------|
| `id` | Primary key |
| `document_id` | FK → `documents` |
| `status` | See status machine below |
| `provider` | `grok` \| `ollama` |
| `model` | Model id string used for the run |
| `error_message` | User-facing on failure |
| `extracted_char_count` | For UI + cloud confirm |
| `cloud_confirmed_at` | ISO timestamp when user confirmed Grok send; null otherwise |
| `created_at`, `updated_at` | |

**Status values:**

| Status | Meaning |
|--------|---------|
| `pending` | Created; not yet extracting |
| `awaiting_cloud_confirm` | Text extracted; Grok chosen; waiting for user |
| `extracting` | AI call in progress |
| `ready` | Drafts written; user can review |
| `failed` | Terminal failure (text, provider, validation) |
| `discarded` | User discarded job; drafts rejected |
| `completed` | No remaining `pending` drafts (all accepted or rejected) |

### 4.2 `draft_lab_panels`

| Field | Notes |
|-------|--------|
| `id` | |
| `import_job_id` | FK → `import_jobs` |
| `sort_order` | Display order |
| `name`, `collected_on`, `facility`, `status`, `notes` | Same semantics as live lab panels |
| `review_status` | `pending` \| `accepted` \| `rejected` |
| `committed_entity_id` | Live `lab_panels.id` after accept; null otherwise |
| `created_at`, `updated_at` | |

### 4.3 `draft_lab_results`

| Field | Notes |
|-------|--------|
| `id` | |
| `draft_panel_id` | FK → `draft_lab_panels` (cascade delete) |
| `sort_order` | |
| `analyte_name`, `value`, `unit`, `ref_low`, `ref_high`, `flag`, `notes` | Same semantics as live lab results |
| `created_at`, `updated_at` | |

### 4.4 Existing tables (reuse)

- **`documents`:** create with `uploaded_via=ai_import` for new imports.
- **`document_links`:** on accept, link document → `lab_panel` entity.
- **`lab_panels` / `lab_results`:** only written on accept; `source=pdf_import`.
- **`app_settings`:** store non-secret AI preferences (default provider, model names, Ollama base URL).

### 4.5 Status machine (job)

```
pending
  → awaiting_cloud_confirm   (grok, after text extract)
  → extracting               (ollama after text; or grok after confirm)
extracting → ready | failed
awaiting_cloud_confirm → extracting | discarded | failed
ready → completed | discarded
  (completed when zero drafts with review_status=pending)
failed, discarded, completed → terminal
  (failed may → extracting on Retry after fixing config)
```

---

## 5. User flows & UI

### 5.1 Routes

| Route | Purpose |
|-------|---------|
| `/import` | List import jobs (file name, status, provider, date) |
| `/import/new` | Upload PDF, choose provider/model, start job |
| `/import/[id]` | Cloud confirm, progress, multi-panel review |

Sidebar: add **Import** near Documents.

### 5.2 New import

1. Choose file (PDF only; existing size limits).
2. Choose provider (default from Settings); optional model override.
3. Upload → Document + ImportJob.
4. Extract text; set `extracted_char_count`.
5. If text insufficient → `failed` with scan message.
6. If Grok → `awaiting_cloud_confirm` and show confirm card.
7. If Ollama → proceed to extract immediately.

### 5.3 Cloud confirm (Grok only)

Show:

- Provider name (xAI Grok)
- Original filename
- Approximate character count of extracted text
- Disclaimer: text leaves this machine; assistive only; review before chart write
- Actions: **Send to cloud** | Cancel / change provider (or discard)

On confirm: set `cloud_confirmed_at`, run extraction.

### 5.4 Review UI

For each draft panel (`review_status=pending`):

- Header: name, collected date, facility
- Editable table of results (same fields as manual lab entry)
- Actions: **Accept panel**, **Edit** (inline or form), **Reject**

Job-level actions:

- **Accept all pending**
- **Discard job** (reject remaining drafts; keep Document)
- Link to open/download source PDF
- Footer disclaimer: not medical advice

Accepted panels show link to live lab detail; rejected show status badge.

### 5.5 Settings — AI providers

Replace Phase 1 stub with real configuration:

| Setting | Storage |
|---------|---------|
| Default extract provider | `app_settings` |
| Grok model | `app_settings` (default `grok-4.5` or current docs.x.ai alias; verify at implement time) |
| Ollama base URL | `app_settings` (default `http://127.0.0.1:11434`) |
| Ollama model | `app_settings` |
| `XAI_API_KEY` | env only; UI shows present/absent, never the secret |

Optional: “Test Ollama connection” button (ping tags/version endpoint).

---

## 6. AI extraction

### 6.1 Provider interface

```ts
interface AIProvider {
  readonly id: "grok" | "ollama";
  completeJson(input: {
    system: string;
    user: string;
    model: string;
  }): Promise<unknown>;
}
```

- **Grok:** OpenAI-compatible client, base URL `https://api.x.ai/v1`, API key from `process.env.XAI_API_KEY`. Prefer structured/JSON mode if available for the chosen model; otherwise instruct JSON-only and parse.
- **Ollama:** HTTP to configured base URL; request JSON-shaped output (format/json when supported).

### 6.2 Output schema (Zod)

```ts
{
  panels: Array<{
    name: string;
    collectedOn?: string | null;  // ISO date preferred
    facility?: string | null;
    status?: "pending" | "final" | null;
    notes?: string | null;
    results: Array<{
      analyteName: string;
      value?: string | null;
      unit?: string | null;
      refLow?: string | null;
      refHigh?: string | null;
      flag?: "normal" | "H" | "L" | "critical" | "unknown" | null;
      notes?: string | null;
    }>;
  }>;
}
```

Rules:

- Labs only; do not invent panels or results not supported by the text.
- Omit or null fields that are not present.
- Normalize flags into the app vocabulary (map common synonyms: High→H, Low→L, etc.).
- Empty `panels: []` is valid → job `ready` with zero drafts and a UI message.

### 6.3 Prompt posture

- Role: structured extractor for personal medical record import.
- Input: extracted PDF text. If length exceeds **200_000** characters, fail the job with a clear “PDF text too large” message (limit documented in README; overridable later if needed).
- Output: JSON matching schema only.
- On validation failure: one repair attempt with schema error feedback, then fail the job.

### 6.4 Analyte master list

Phase 2 keeps AI `analyteName` as free text (same as manual entry). Matching/creating `analytes` catalog rows is out of scope (optional later polish).

### 6.5 Text extraction

- Use a Node PDF text library suitable for local use (choose at implementation; e.g. `pdf-parse` or equivalent maintained option).
- Heuristic: fail if extracted text is empty or below a small threshold (e.g. &lt; 40 non-whitespace chars) after trim.
- Message: indicates likely scan / image-only PDF; OCR not available in Phase 2.

---

## 7. Accept / reject semantics

### 7.1 Accept panel

In a transaction:

1. Validate draft fields with existing lab Zod schemas (reuse Phase 1 validation where possible).
2. Insert `lab_panels` with `source=pdf_import`.
3. Insert `lab_results` rows.
4. `linkDocument(documentId, "lab_panel", panelId)`.
5. Set draft panel `review_status=accepted`, `committed_entity_id=panelId`.
6. If no draft panels for job remain `pending`, set job `status=completed`.

### 7.2 Reject panel

Set `review_status=rejected`. Recompute job completion if none pending.

### 7.3 Edit draft

Update draft panel/result fields in place; re-validate on accept only (or soft-validate on save for UX).

### 7.4 Discard job

Reject all still-pending drafts; set job `discarded`. Do **not** delete Document by default.

### 7.5 Delete Document

**Decision:** Refuse document delete while any non-terminal import job (`pending`, `awaiting_cloud_confirm`, `extracting`, `ready`) references that document. Return a clear error directing the user to complete or discard the import first. Terminal jobs (`failed`, `discarded`, `completed`) do not block delete.

---

## 8. Error handling

| Situation | Behavior |
|-----------|----------|
| Non-PDF / oversize | Reject upload (existing) |
| Insufficient text | Job `failed`; scan message |
| Missing `XAI_API_KEY` | Job `failed`; actionable Settings/env message |
| Ollama unreachable | Job `failed`; check base URL / process |
| Invalid AI JSON after retry | Job `failed` |
| Empty panels | Job `ready`; empty state copy |
| Accept validation failure | Field errors; draft unchanged |
| Mid-extract crash | Job stuck `extracting`; Retry available |

---

## 9. Security & privacy

- Bind localhost remains as Phase 1.
- Auth middleware covers `/import` and existing file routes when passcode enabled.
- Cloud: per-import confirm for Grok; Ollama stays local.
- Secrets only in env; never commit or render API keys.
- Logs: job id, provider, status, error class — not PHI payloads.

---

## 10. Testing strategy

| Layer | Coverage |
|-------|----------|
| Unit | Extract Zod schema; flag normalization; text-too-short helper |
| Integration | Job create → mock AI payload → drafts; accept → live labs + link; reject; discard; multi-panel partial accept |
| AI HTTP | Mock fetch/client; no live Grok/Ollama in CI |
| Manual UAT | Real lab PDF with Grok; optional Ollama if installed |

---

## 11. Implementation stack (additions)

| Concern | Choice |
|---------|--------|
| Grok client | OpenAI-compatible SDK (`openai` package) → `https://api.x.ai/v1` |
| Ollama | Native `fetch` to local HTTP API |
| PDF text | Library chosen at implement time; text layer only |
| Validation | Zod (shared with services) |
| Persistence | Drizzle + SQLite (new tables + bootstrap/migrate path consistent with Phase 1) |

Env additions:

```
XAI_API_KEY=
# optional overrides if not only in app_settings:
# OLLAMA_BASE_URL=http://127.0.0.1:11434
```

---

## 12. Delivery slices (suggested)

1. Schema + import job service (create, status, drafts) with tests; no AI yet.
2. PDF text extract + job failure path for scans.
3. AI provider router + mockable extract; write drafts.
4. Import UI: list, new, cloud confirm, review, accept/reject.
5. Settings AI config + README / `.env.example` updates.
6. Polish: retry, empty states, sidebar, document-delete guard.

---

## 13. Risks

| Risk | Mitigation |
|------|------------|
| Hallucinated labs | User review required; prompt “do not invent”; validation |
| Accidental cloud send | Per-import Grok confirm with char count |
| Large PDFs / timeouts | Char cap; clear errors; job status for refresh |
| Weak Ollama JSON | Repair retry; fail clearly; prefer Grok for hard PDFs |
| Scope creep into OCR/chat | Explicit non-goals |

---

## 14. Out of scope (defer)

- OCR / vision PDF paths  
- Non-lab entity extraction  
- Phase 3 co-pilot / FR-001  
- Phase 4 encrypted backups  
- Background worker process / queue external to Next.js  

---

## 15. Next step

Create implementation plan at `docs/superpowers/plans/2026-07-22-wfm-health-tracker-phase2.md`, then execute task-by-task with tests first where practical.
