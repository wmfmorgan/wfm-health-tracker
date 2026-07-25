# Future requirements

Ideas locked for later phases. Not in current implementation scope.

---

## FR-001: Lab analyte lay explanations (AI-generated)

**Status:** Planned (AI phase — after records hub; natural fit for Phase 3 co-pilot or a dedicated “lab literacy” slice)  
**Priority:** Medium–high (personal education / UC + aging chart)  
**Depends on:** Analyte master list (done); AI provider router (Grok + local)  

### Problem

Lab analyte names and units are clinical. When reviewing results, it is hard to remember:

1. What the analyte **is** in plain language  
2. How it **affects overall health** (and, where relevant, chronic conditions)

### Desired capability

For each **analyte** (master catalog and/or in context of a result row):

| Content | Description |
|---------|-------------|
| **Lay definition** | Short plain-language “what this measures” |
| **Health impact** | How high/low or abnormal values can relate to overall health (general education, not a diagnosis) |

Generated **by AI** (user-selectable provider: Grok cloud and/or local Ollama).

### UX (draft)

- On **Analytes** detail/list: optional “Explain” or show cached explanation  
- On **Lab panel detail** / result rows: expandable “What is this?” next to analyte name  
- Prefer **cache** explanations per analyte (and maybe per model) so reopening a panel does not re-call the API every time  
- Allow **regenerate** if the user wants a fresh explanation  
- Always show medical disclaimer: decision support / education only, not medical advice  

### Data (draft)

Store on or next to the analyte master list, e.g.:

- `lay_summary` — plain-language definition  
- `health_impact` — how it relates to health  
- `ai_generated_at`, `ai_provider`, `ai_model` — provenance  
- Optional: version hash of prompt so stale text can be refreshed after prompt changes  

Alternatively: separate `analyte_explanations` table keyed by `analyte_id` + provider/model.

### AI behavior (draft)

- Input: analyte name, default unit, optional notes; **optional** user profile context (e.g. UC, active diagnoses) for more relevant impact wording — **only if** user opts into sending that context  
- Output: structured JSON `{ laySummary, healthImpact }` validated before save  
- Default offline path: local model; cloud when user chooses Grok  
- Do **not** invent personal medical conclusions from a single result value unless the user explicitly asks for “interpret this result” (that may be a separate co-pilot feature)

### Out of scope for this FR

- Full panel interpretation / trend analysis across dates (related but separate co-pilot feature)  
- Replacing clinician advice  
- Auto-generating explanations for every analyte on seed without user request (optional background job later; start on-demand)

### Acceptance criteria (when built)

1. User can request an AI explanation for an analyte from the UI  
2. Response includes lay definition + health impact  
3. Explanation is saved and shown again without a new API call until regenerate  
4. Provider choice respects dual Grok/Ollama settings  
5. UI labels content as educational / not medical advice  
6. Works offline when local provider is selected and available  

### Related

- Design: Phase 3 AI co-pilot (`docs/superpowers/specs/2026-07-22-wfm-health-tracker-design.md`)  
- Existing: `analytes` table, lab results editor, common analyte seed  

---

## FR-002: Cloud-data audit log

**Status:** Backlog (formerly under retired Phase 4 Hardening)  
**Priority:** Medium (privacy visibility when using Grok / any cloud AI)  
**Depends on:** Dual AI provider router (done); import, evaluate, chat call sites (done)

### Problem

When Grok (or any future cloud path) is used, PHI may leave the machine. Today the app shows **in-the-moment** warnings and size hints on some flows, but there is **no durable, user-visible history** of what left, when, or from which feature. Per-import cloud confirm was also removed, so post-hoc visibility matters more.

### Desired capability

A **user-visible audit of cloud AI usage** — metadata about sends, not a silent black box.

| Content | Description |
|---------|-------------|
| **When** | Timestamp of the cloud call |
| **Surface** | Which feature triggered it (import extract, evaluate, chat, skill, …) |
| **Provider / model** | e.g. Grok + model id |
| **Scale** | Approximate payload size (chars / tokens estimate) |
| **Outcome** | Success / failure (optional short error class) |

Ollama / local paths should either be omitted or clearly labeled **local (not cloud)**.

### UX (draft)

- **Settings** (or a small “Privacy / Cloud activity” page): reverse-chronological list of cloud events  
- Optional filters: surface, date range  
- Empty state: “No cloud AI calls recorded” when user only uses Ollama  
- Do **not** dump full prompt/chart text in the default UI (metadata-first for safety and storage)

### Data (draft)

Append-only events table, e.g. `ai_cloud_events`:

- `id`, `created_at`  
- `surface` — `import` | `evaluate` | `chat` | `skill` | …  
- `provider`, `model`  
- `approx_char_count` (or similar)  
- `ok` / `error_code` (optional)  
- Optional later: redacted preview hash or retention policy  

Stay inside `data/` so backup of the folder includes the audit log.

### Out of scope for this FR

- Encrypted backup export (**FR-003**)  
- Stronger app lock UX (**FR-004**)  
- Storing full request/response bodies by default  
- Multi-device sync or remote audit dashboards  

### Acceptance criteria (when built)

1. Every successful (and failed, if feasible) **cloud** AI call appends an audit row  
2. User can open a list of past cloud events with when / surface / model / size  
3. Local-only (Ollama) usage does not look like cloud sends  
4. Audit log lives under `data/` and is part of the normal backup unit  
5. UI still shows assistive / not medical advice where relevant; audit is privacy tooling, not clinical history  

### Related

- Phase map: Phase 4 Hardening retired; this is backlog only (`2026-07-22-wfm-health-tracker-design.md`)  
- Phase 2/3 privacy patterns: dual provider, Grok disclosure, former per-request confirm  

---

## FR-003: Encrypted backup export

**Status:** Backlog (formerly Phase 4 Hardening)  
**Priority:** Medium–high (PHI on disk; portable offline backup)  
**Depends on:** Stable `data/` layout (SQLite + uploads) — done

### Problem

v1 backup guidance is “copy the `data/` folder.” That works but is easy to forget, offers no password protection at rest for a portable archive, and is awkward to move between machines without leaking plaintext PHI on intermediate media (USB, cloud drive folder, etc.).

### Desired capability

In-app (or CLI) **export of a single encrypted archive** containing everything needed to restore the chart:

| Content | Description |
|---------|-------------|
| **SQLite DB** | `health.sqlite` (or current DB path) |
| **Uploads** | PDF binaries under the uploads root |
| **Optional** | Same-folder artifacts that are part of the backup unit (e.g. custom skills under `data/` if present) |

Protect with a **user-chosen password** (or passphrase). Restore path: import archive + password → rebuild usable `data/`.

### UX (draft)

- **Settings → Backup:** “Export encrypted backup” / “Restore from backup”  
- Password + confirm; show warnings about forgetting the password (no recovery)  
- Progress for large upload trees  
- Keep README note that raw `data/` copy still works for power users  

### Implementation notes (draft)

- Zip (or tar) + encryption (e.g. AES via a well-supported library; prefer established formats over home-rolled crypto)  
- Never write the password to disk or logs  
- Export file default name includes date; user chooses destination  
- Restore should refuse to clobber without explicit confirm  

### Out of scope for this FR

- Continuous sync / multi-device live backup  
- Cloud-hosted backup product  
- Cloud-data audit (**FR-002**)  
- Lock/passcode UX polish (**FR-004**)  

### Acceptance criteria (when built)

1. User can export an encrypted archive of the full backup unit from the app  
2. Archive cannot be read without the password (smoke-checked)  
3. User can restore into a clean or confirmed-overwrite data dir and open the app with prior records/docs  
4. Password is not stored; failed restore with wrong password is a clear error  
5. Docs/README describe export + still mention raw `data/` copy as an option  

### Related

- Design §6.5 Backup v1; retired Phase 4 hardening  

---

## FR-004: Stronger app lock UX

**Status:** Backlog (formerly Phase 4 Hardening)  
**Priority:** Medium (optional passcode exists; polish and hardness)  
**Depends on:** Optional `APP_PASSWORD` / session lock (Phase 1) — done

### Problem

Passcode lock exists, but UX and hardness may be thin for a PHI app left open on a shared machine: weak session lifetime clarity, easy to leave unlocked, limited feedback when locked, and no richer lock behaviors (timeout, re-lock, lock now).

### Desired capability

Make the **optional app lock feel intentional and harder to bypass accidentally**:

| Area | Ideas (pick at design time) |
|------|------------------------------|
| **Lock now** | Explicit control in shell/settings to lock immediately |
| **Idle timeout** | Optional auto-lock after N minutes of inactivity |
| **Session clarity** | Clear locked vs unlocked state; login copy that this protects the local chart |
| **Route coverage** | Confirm UI + file/PDF routes remain gated when locked |
| **Recovery** | Document that forgotten passcode = config/`APP_PASSWORD` reset (no cloud recovery) |

### UX (draft)

- Settings: enable/change/disable passcode; optional idle timeout  
- Header or menu: “Lock now” when enabled  
- Locked screen: simple passcode entry; no chart chrome visible behind it  

### Out of scope for this FR

- Multi-user accounts / roles  
- OS keychain SSO as a requirement (optional later)  
- Encrypted backup (**FR-003**)  
- Full-disk encryption (OS-level; document only)  

### Acceptance criteria (when built)

1. User can lock the app immediately when passcode is enabled  
2. Optional idle auto-lock works when configured  
3. While locked, chart UI and document file routes require unlock  
4. Lock/unlock states are obvious in the UI  
5. README or settings text explains passcode reset / no remote recovery  

### Related

- Phase 1 optional passcode; retired Phase 4 hardening  

---

## FR backlog index

| ID | Title | Notes |
|----|--------|--------|
| FR-001 | Lab analyte lay explanations (AI) | Lab literacy / co-pilot polish |
| FR-002 | Cloud-data audit log | Privacy; was Phase 4 |
| FR-003 | Encrypted backup export | Was Phase 4 |
| FR-004 | Stronger app lock UX | Was Phase 4 |
