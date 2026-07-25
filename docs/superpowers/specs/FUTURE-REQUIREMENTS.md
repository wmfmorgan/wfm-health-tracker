# Future requirements

Ideas locked for later phases. Not in current implementation scope.

---

## FR-001: Lab analyte lay explanations (AI-generated)

**Status:** Partial — Phase 3 shipped `/analyte-explain` as a **chat-only** skill; this FR is the remaining **cached, in-record UI** (Analytes + lab rows), not a new skill  
**Priority:** Medium–high (personal education / UC + aging chart)  
**Depends on:** Analyte master list (done); AI provider router (Grok + local); slash skill body can be reused  

**Already shipped (do not re-build as a greenfield skill):** Chat slash skill `analyte-explain` that produces lay definition + health impact in-thread.

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

## FR-005: Apply synthesize / skill output to My plan

**Status:** Backlog (Phase 3 skills follow-on)  
**Priority:** Medium  
**Depends on:** My plan entity + edit UI (done); `/synthesize-plan` chat skill (done)

### Problem

`/synthesize-plan` (and similar chat outputs) can **suggest** My plan text, but the user must copy/paste into My plan. Design called out an explicit **Apply to My plan** accept path so synthesis becomes reviewed memory without free-text paste errors.

### Desired capability

- On assistant messages produced by synthesize-plan (and optionally other skills marked for My plan), show **Apply to My plan** (or “Replace My plan” / “Append”).  
- Apply requires explicit click; never silent.  
- Optional: open a short confirm preview of the markdown that will be written.  
- Optional later: skill `side_effect: my_plan_draft` with the same accept gate.

### Out of scope

- Auto-writing My plan on every chat turn  
- Overwriting without confirm  

### Acceptance criteria (when built)

1. After `/synthesize-plan`, user can apply the suggestion to My plan in one confirm action  
2. My plan body updates and is included in later chat/evaluate context  
3. No apply without user action  

### Related

- Phase 3 skills design: v1 synthesize-plan chat-only; “Apply to My plan” fast follow  

---

## FR-006: Persona view section regenerate

**Status:** Backlog (Phase 3 Evaluate follow-on)  
**Priority:** Low–medium  
**Depends on:** Evaluate → draft/accepted views with optional `sections_json` (done)

### Problem

Evaluate flow design included **Regenerate section** (e.g. re-run only “open questions” or “labs”) without re-evaluating the entire chart. Today the user must re-run full Evaluate or edit markdown by hand.

### Desired capability

- On draft (and optionally accepted-as-new-draft) view detail: list sections and **Regenerate this section**.  
- Call AI with narrow context + existing body + section id; merge result into draft.  
- Preserve citations/fact-opinion where possible; mark draft dirty until accept.

### Out of scope

- Silent section updates without user action  
- Multi-agent section specialists  

### Acceptance criteria (when built)

1. User can regenerate a single named section on a draft view  
2. Rest of the view body remains unless that section is replaced  
3. Accept still required before the view becomes current memory  

### Related

- Phase 3 design §6.2 Evaluate step 5  

---

## FR-007: Shared chart brief snapshot (AI `update_snapshot`)

**Status:** Backlog (Phase 3 memory follow-on)  
**Priority:** Low–medium  
**Depends on:** Chart brief / persona views (done); context builder (done)

### Problem

First ship: Evaluate writes **persona views only**. The design also described a **shared factual snapshot** (at-a-glance brief layer) refreshed via an `update_snapshot` skill with review. Today the dashboard “snapshot” is live DB counts/recent labs, not a review-gated brief memory artifact.

### Desired capability

- Skill or Brief action: **Update snapshot** → draft shared snapshot (structured or markdown).  
- User accept/reject; only accepted snapshot is injected as Layer B context.  
- Clear separation from persona opinions (snapshot = shared facts / at-a-glance, not a persona lens).

### Out of scope

- Auto-refresh on every evaluate without opt-in  
- Replacing live chart facts in SQLite  

### Acceptance criteria (when built)

1. User can produce a draft shared snapshot and accept it  
2. Chat/evaluate context can include the accepted snapshot when scoped  
3. Draft snapshots never appear in skill context  

### Related

- Phase 3 design §5.2 `update_snapshot`; §4 memory shape; first-ship decision: evaluate = persona view only  

---

## FR-008: Persona view version rollback

**Status:** Backlog (Phase 3 brief follow-on)  
**Priority:** Low–medium  
**Depends on:** Version history + diff on views (done)

### Problem

Accepted views keep **version history** and a **diff vs previous**, but restoring an older accepted version as **current** (rollback) is incomplete or missing as a first-class action.

### Desired capability

- On version history: **Restore vN as current** (creates a new version or re-marks current — pick one model at design time; prefer new version copying vN body for auditability).  
- Confirm dialog; do not delete history.  
- Diff remains available after restore.

### Out of scope

- Deleting version history  
- Branching multi-timeline edits  

### Acceptance criteria (when built)

1. User can restore a prior accepted version so chat/evaluate use that body as current  
2. History still lists prior versions  
3. Action is explicit and confirmed  

### Related

- Phase 3 extras: versions/rollback  

---

## FR-009: Chat → Evaluate affordance

**Status:** Backlog (Phase 3 co-pilot follow-on)  
**Priority:** Low  
**Depends on:** Chat threads + Evaluate form (done)

### Problem

Design allowed chat to **soft-suggest** “Start Evaluate as {persona} with this focus?” without writing views. Users currently switch routes/manual focus themselves.

### Desired capability

- After a chat turn (especially with a persona lens), optional chip/button: **Run Evaluate** pre-filled with persona + focus note from the thread (e.g. last user message or summary).  
- Navigates to Evaluate (or opens evaluate flow) with fields populated; does **not** auto-run without submit.  
- Never writes a persona view until Evaluate completes + user accept path.

### Out of scope

- Auto-running Evaluate on every message  
- Chat writing drafts without Evaluate  

### Acceptance criteria (when built)

1. User can jump from chat to Evaluate with persona/focus prefilled  
2. No draft view is created until they run Evaluate  
3. Chat history unchanged by the affordance alone  

### Related

- Phase 3 design §5.1 chat “May return a soft suggestion UI”  

---

## FR-010: Auto-invoke skills from free text (no slash)

**Status:** Backlog (Phase 3 skills optional later; was non-goal for first skills ship)  
**Priority:** Low  
**Depends on:** Slash palette + skill registry (done)

### Problem

Skills only run via `/skill-name`. Users may type natural language (“check my meds”) and expect the med-check skill without knowing the slash name.

### Desired capability

- Optional router: classify user message → suggest or auto-run a matching skill (with clear UI that a skill was selected).  
- Prefer **suggest chip** over silent auto-run for safety.  
- User can disable auto-routing in settings.

### Out of scope

- Full agent tool loop / shell skills  
- Bypassing safety suffix  

### Acceptance criteria (when built)

1. Natural language can surface the correct skill suggestion  
2. User remains in control (confirm or one-tap) before skill run if auto-run is off  
3. Slash palette remains the reliable path  

### Related

- Phase 3 skills design non-goal: auto-invoke without `/`  

---

## FR backlog index

| ID | Title | Notes |
|----|--------|--------|
| FR-001 | Lab analyte lay explanations (AI) | **Partial** — chat skill done; cache/UI left |
| FR-002 | Cloud-data audit log | Privacy; was Phase 4 |
| FR-003 | Encrypted backup export | Was Phase 4 |
| FR-004 | Stronger app lock UX | Was Phase 4 |
| FR-005 | Apply skill output to My plan | Phase 3 skills follow-on |
| FR-006 | Persona view section regenerate | Phase 3 Evaluate follow-on |
| FR-007 | Shared chart brief snapshot | Phase 3 memory follow-on |
| FR-008 | Persona view version rollback | Phase 3 brief follow-on |
| FR-009 | Chat → Evaluate affordance | Phase 3 co-pilot follow-on |
| FR-010 | Auto-invoke skills (no slash) | Phase 3 skills optional later |
