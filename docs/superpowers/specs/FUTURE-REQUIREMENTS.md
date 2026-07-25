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

## FR-011: AI-maintained health profile (user-editable)

**Status:** Backlog  
**Priority:** High (durable “who I am” context for all co-pilot surfaces)  
**Depends on:** Profile record (done); context builder; chat + evaluate (done); accepted persona views / My plan optional as sources

### Problem

Structured chart rows (meds, labs, diagnoses) are facts. There is no **living narrative profile** that summarizes the person—chronic conditions, goals, preferences, what “normal” looks like for them—that AI helps keep current and that every chat/evaluate run can trust. Without it, each co-pilot call re-discovers context or invents a thin picture from raw tables only.

### Desired capability

A **Health profile** document (markdown and/or structured sections) that:

| Property | Description |
|----------|-------------|
| **AI-generated** | Can be created/refreshed from live chart + accepted views + optional user notes |
| **User-editable** | Full edit in UI; user text is source of truth after save |
| **AI-maintained** | Optional “Refresh with AI” proposes a **draft** update; user must accept/merge (same review spirit as Evaluate) |
| **Referenced always** | Context builder includes health profile in **chat and evaluate** (and relevant skills) by default |

### UX (draft)

- Route under Profile or Brief: **Health profile**  
- Display current body; **Edit** / **Save**  
- **Generate** (first time) / **Suggest update** (later) → show draft diff → **Accept** / **Discard**  
- Provenance: last human edit vs last AI-accepted refresh; provider/model if AI  

### Data (draft)

- Single-row or versioned table e.g. `health_profile`: `body_md`, `sections_json` optional, `updated_at`, `updated_by` (`user` | `ai_accepted`), optional `ai_provider` / `ai_model`  
- Prefer version history if refresh is common (align with persona view pattern)  

### Context rules

- Always inject accepted health profile into chat + evaluate context (size-capped).  
- Draft AI refreshes **never** enter context until user accepts.  
- Do not silently overwrite user edits.

### Out of scope

- Multi-patient profiles  
- Auto-overwrite without review  
- Replacing clinical tables (meds/labs remain source for structured facts)  
- FR-007 shared brief snapshot (related but separate “at a glance” artifact)  

### Acceptance criteria (when built)

1. User can view and freely edit a health profile and save it  
2. User can ask AI to generate or propose an update; proposal requires accept before it becomes current  
3. Chat and evaluate include the current health profile in assembled context  
4. Unaccepted AI drafts never appear in co-pilot context  
5. Assistive / not medical advice labeling remains on AI actions  

### Related

- Context builder; persona views; My plan; FR-007 snapshot (do not conflate)  

---

## FR-012: Drug interaction skill + med/supplement interaction UI

**Status:** Backlog  
**Priority:** High (safety-adjacent decision support)  
**Depends on:** Medications + supplements CRUD (done); skill registry (done); optional `/med-check` skill (exists—this FR goes deeper and persists flags)

### Problem

`/med-check` can discuss interactions in chat, but there is no **durable, visible interaction signal** on the medications and supplements tables. Example: doxycycline with zinc or magnesium—absorption interaction—should be **flagged on the rows** with a short reason, not only in a one-off chat reply.

### Desired capability

1. **Skill:** dedicated **drug interaction** skill (slash), e.g. `/drug-interactions` (or deepen `/med-check`), that reviews active meds + supplements (+ allergies) and returns structured interaction findings.  
2. **UI section on meds & supplements:** per-entity (or pair) interaction flags with reason text, severity/hint if available, and when last checked.  
3. **Example expectation:** antibiotic such as **doxycycline** + **zinc** / **magnesium** supplements flagged as interactive with a plain-language reason (e.g. divalent cations reduce absorption / separate dosing).

### UX (draft)

- Medications list/detail: **Interactions** section (badges or list: “May interact with Magnesium — take hours apart”)  
- Supplements list/detail: same  
- **Run interaction check** (skill) from Co-pilot and/or from meds page  
- Results: write to structured store + show in UI; user can dismiss/clear outdated flags after med list changes  
- Always disclaimer: not a complete DDI database; educational / assistive only  

### Data (draft)

- Table e.g. `drug_interactions` or `entity_interaction_flags`:  
  - `id`, `left_entity_type` / `left_entity_id`, `right_entity_type` / `right_entity_id` (med/supplement)  
  - `severity` optional (`info` | `caution` | `serious` — free-text OK if AI-sourced)  
  - `reason`, `source` (`ai` | `user`), `checked_at`, `provider`, `model`  
- Prefer relational pairs for two-way display on both entities  

### Skill behavior (draft)

- Input: active meds + supplements (+ allergies); optional focus  
- Output: structured list of pairs + reasons; validate before save  
- Prefer local model for privacy; Grok opt-in  
- Do **not** invent agents not on the chart  

### Out of scope

- Licensed commercial DDI database integration (optional later data source)  
- Auto-blocking prescriptions  
- Replacing clinician/pharmacist advice  

### Acceptance criteria (when built)

1. User can run a drug-interaction skill against current meds/supplements  
2. Findings appear on medication and supplement UIs with a reason  
3. Example class of issue (e.g. doxycycline ↔ zinc/magnesium) can be represented when those agents are on the chart  
4. Flags refresh or clear when entities change (or user re-runs check)  
5. Clear assistive / not medical advice labeling  

### Related

- Existing `/med-check` skill; medications & supplements records  

---

## FR-013: Vitals & body metrics time series

**Status:** Backlog  
**Priority:** Medium–high  
**Depends on:** Profile height/weight as single current values (done—keep or migrate carefully)

### Problem

Profile today holds **point-in-time** height/weight (and similar static fields). There is no first-class place to record **longitudinal health metrics**—blood pressure, weight over time, BMI, heart rate, etc.—or a dedicated UI section for them. **Full metric catalog is TBD** when this FR is designed/implemented.

### Desired capability

A new **vitals / metrics** domain:

| Area | Description |
|------|-------------|
| **Table(s)** | Time-stamped measurements (and optional metric definitions) |
| **UI section** | List + add/edit/delete; optional simple trends later |
| **Metrics (illustrative, not final)** | BP (systolic/diastolic), height, weight, BMI (computed or stored), others **TBD** |
| **Context** | Recent vitals available to chat/evaluate when scoped |

### Design open points (resolve at implement)

- Final list of metric types and units  
- Single wide table vs `metric_type` + value JSON  
- Whether profile height/weight remain “current” denormalized from latest vitals  
- Targets/goals and out-of-range flags  
- Device import (manual entry first)

### UX (draft)

- Sidebar or Profile subsection: **Vitals** / **Metrics**  
- Add reading: type, value(s), unit, measured-at, notes  
- Table sorted by date; filter by type  
- Optional: show latest BP/weight on dashboard  

### Data (draft — TBD)

Example shape (subject to change):

- `vital_readings`: `id`, `metric_type`, `value_primary`, `value_secondary` (e.g. diastolic), `unit`, `measured_at`, `notes`, timestamps  
- Or normalized `metric_definitions` + `metric_observations`  

BMI may be computed from height + weight rather than always stored.

### Out of scope (first cut)

- Continuous wearables sync  
- Clinical-grade device certification  
- Full symptom journals (separate non-goal unless later FR)  

### Acceptance criteria (when built)

1. User can CRUD timestamped readings for the agreed initial metric set  
2. Dedicated UI section exists (not only buried in free-text notes)  
3. Full metric list is decided and documented during the FR design pass (TBD frozen before code)  
4. Recent readings can be included in co-pilot context when selected  
5. Existing profile height/weight behavior is defined (keep, migrate, or dual-write)  

### Related

- Profile height/weight fields; dashboard; context builder  

---

## FR-014: Dashboard analyte trends

**Status:** Backlog  
**Priority:** Medium–high (at-a-glance chart monitoring)  
**Depends on:** Lab panels + results (done); analytes catalog (done); dashboard page (done)

### Problem

The dashboard shows counts and recent activity, but not **how selected lab analytes are moving over time**. For chronic care, trends (e.g. CRP, calprotectin, creatinine) matter more than a single latest number buried in a panel.

### Desired capability

On the **dashboard**, show **trend charts (or sparklines)** for **user-selected analytes**:

| Area | Description |
|------|-------------|
| **Selection** | User picks which analytes to pin/track (settings on dashboard or from analyte list) |
| **Series** | Time series from lab results across panels (date = panel `collectedOn` or equivalent) |
| **Display** | Line/sparkline per selected analyte; value + unit; optional ref-range band if available |
| **Empty** | Clear empty state when no history or no selection |

### UX (draft)

- Dashboard section: **Lab trends**  
- “Manage tracked analytes” multi-select (reuse multi-select patterns)  
- One chart per analyte or small multi-series if units match (prefer one chart per analyte for mixed units)  
- Click through to full history (**FR-015**) or lab panel  

### Data / query (draft)

- Aggregate lab results by normalized analyte name (or `analyte_id` if linked) ordered by collection date  
- Persist selection: settings key or `tracked_analytes` table  

### Out of scope

- Clinical decision alerts / auto-diagnosis from trends  
- Full statistical analytics package  
- Wearable streams (see FR-013 for vitals)  

### Acceptance criteria (when built)

1. User can select one or more analytes to show on the dashboard  
2. Dashboard renders a trend for each selected analyte from historical lab results  
3. Selection persists across sessions  
4. Missing/sparse data fails gracefully  
5. Links exist to deeper history or source lab where practical  

### Related

- Dashboard; labs; analytes; **FR-015** full analyte results table  

---

## FR-015: Analyte results table (latest + expandable history)

**Status:** Backlog  
**Priority:** Medium–high  
**Depends on:** Lab panels + results (done); analytes catalog (done); document links on panels (done where present)

### Problem

Analytes exist as a catalog, and results live inside individual lab panels. There is no **single table of all analytes with latest values** and a way to expand **past results**, each row/history entry **linked back to the source lab panel and document** when available.

### Desired capability

An **analyte-centric results table**:

| Behavior | Description |
|----------|-------------|
| **Default rows** | One row per analyte (or per analyte that has ≥1 result): name, latest value, unit, flag, collection date |
| **Expand row** | Selecting/expanding a row shows **past results** (date, value, unit, flag) in chronological order |
| **Source links** | Each result (latest and historical) links to the **lab panel** and, when linked, the **source document/PDF** that produced or attaches to that panel |
| **Navigation** | Open lab detail and/or open document viewer from the history line |

### UX (draft)

- Route: extend **Analytes** page or new **Lab results by analyte** view  
- Compact table; expand/collapse chevron on row  
- Badges for abnormal flags on latest  
- Empty history: “No results yet”  
- Optional filter: only analytes with results; search by name  

### Data / query (draft)

- Join `lab_results` → `lab_panels` → document links (`documents` / link table)  
- “Latest” = max `collected_on` (or panel created date fallback) per analyte name/id  
- History = all matching results sorted desc  

### Out of scope

- Editing results from this table (edit remains on lab panel)  
- AI interpretation on this page (FR-001 / lab-interpret are separate)  
- Replacing panel-centric lab CRUD  

### Acceptance criteria (when built)

1. Table shows analytes with their **latest** result summary  
2. Expanding a row lists **prior results** for that analyte  
3. Each history line (and latest) can navigate to the **source lab panel**  
4. When a document is linked to that panel, user can open the **source document**  
5. Analytes with no results are handled clearly (hidden or empty state)  

### Related

- Labs, documents, analytes catalog; **FR-014** dashboard trends (can deep-link here)  

---

## FR-016: Symptoms log + AI chart cross-check

**Status:** Backlog  
**Priority:** Medium–high (chronic-care tracking; previously an explicit non-goal of early phases)  
**Depends on:** Diagnoses, labs, meds/supplements (done); dual AI providers + skills (done); optional FR-011 health profile / FR-013 vitals as extra context

### Problem

There is no place to **log symptoms over time** (onset, severity, notes). Free-text notes on other entities are a poor fit. Separately, when symptoms change, it is hard to manually correlate them with **labs, diagnoses, meds, and other chart data**—AI can help surface *possible* relationships for the user to review, without diagnosing.

### Desired capability

1. **Symptoms table + UI** — first-class CRUD for symptom entries.  
2. **AI cross-check** — skill and/or action that reviews logged symptoms against live chart context (labs, diagnoses, meds/supplements, allergies, optional vitals/profile) and returns structured, reviewable findings.

### Symptom log (data + UX draft)

| Field (illustrative) | Notes |
|----------------------|--------|
| `name` / free-text label | e.g. “abdominal pain”, “fatigue” |
| `occurred_at` / onset | When it started or was noted |
| `severity` | Optional scale (e.g. 1–10) or enum |
| `status` | active / resolved / intermittent (TBD) |
| `notes` | Free text |
| timestamps | created/updated |

**UI:** Sidebar or Records group — **Symptoms** list + new/edit/detail; filters by date/status; optional dashboard “recent symptoms.”

### AI cross-check (draft)

| Area | Description |
|------|-------------|
| **Trigger** | Slash skill e.g. `/symptom-check` and/or button on Symptoms page: “Check against chart” |
| **Context** | Selected or recent symptoms + diagnoses + relevant labs + active meds/supps (+ allergies); size-capped |
| **Output** | Structured findings: possible correlations, questions to ask a clinician, gaps—not a diagnosis |
| **Persistence** | Optional: save last check summary on a symptom or as a chat-only reply (prefer chat/skill first; durable notes only if user accepts) |

Always show **assistive / not medical advice** disclaimer.

### Out of scope

- Emergency triage / “call 911” automation beyond static disclaimer  
- Auto-creating diagnoses or lab orders from symptoms  
- Wearable continuous symptom streams  
- Replacing clinician evaluation  

### Acceptance criteria (when built)

1. User can create, edit, list, and delete symptom log entries in a dedicated UI  
2. Symptom data is stored in SQLite under `data/` (backup unit)  
3. User can run an AI check of symptoms against chart data (labs, diagnoses, etc.)  
4. AI output is clearly educational / assistive and does not write diagnoses without user action  
5. Symptoms can be included in co-pilot context when scoped (chat/evaluate)  

### Related

- Early design non-goal “symptom journals” — this FR promotes a focused v1  
- FR-011 health profile; FR-013 vitals; `/lab-interpret`, evaluate personas  

---

## FR-017: Doctor-visit notes on labs and tests

**Status:** Backlog  
**Priority:** Medium–high (visit prep + post-visit memory; chronic care)  
**Depends on:** Lab panels (done); clinical tests (done); optional procedures later  

### Problem

When discussing a **lab panel** or **clinical test** with a doctor, the user wants to capture what was said, questions asked, decisions, and follow-ups **on that record**. Today each lab/test has only a single free-text `notes` field mixed with result/import notes—there is no clear place for **visit-oriented, dated discussion notes** (prep before the appointment or write-up after).

### Desired capability

Attach **clinical discussion notes** to labs and tests:

| Area | Description |
|------|-------------|
| **Targets** | Lab panels and clinical tests (v1); procedures optional later |
| **Multiple notes** | Several notes per entity over time (not one overwrite-only blob) |
| **Dating** | Note date (visit / discussion date), distinct from lab `collectedOn` / test `performedOn` |
| **Content** | Free-text body; optional short title or tags (e.g. prep, visit, follow-up) |
| **UX** | Section on lab detail and test detail: list notes newest-first; add / edit / delete |
| **Visibility** | Easy to scan before the next appointment; optional “prep” filter |

### Relationship to existing `notes`

- Keep entity-level `notes` for **record metadata** (import quirks, lab/source comments).  
- **FR-017 notes** are **user discussion / visit notes** about that lab or test with a clinician.  
- If both remain, label them clearly in UI so they are not confused.

### Data / UX (draft)

| Field (illustrative) | Notes |
|----------------------|--------|
| `entity_type` | `lab_panel` \| `test` (extend later if needed) |
| `entity_id` | FK to panel or test |
| `noted_on` | Date of visit/discussion (default today) |
| `kind` | optional: `prep` \| `visit` \| `follow_up` \| `other` |
| `body` | Main note text |
| `created_at` / `updated_at` | Audit |

- Route: sections on `/labs/[id]` and `/tests/[id]`  
- Optional: surface latest discussion note on list rows or dashboard “next visit prep”  
- Optional later: include discussion notes in co-pilot chart context for evaluate/chat (privacy-sensitive—opt-in)

### Out of scope (v1)

- Full multi-provider visit / encounter model  
- Audio recording or transcription  
- AI auto-summary of visits (could be a follow-on skill)  
- Notes on individual analytes only (panel/test level is enough for v1)  

### Acceptance criteria (when built)

1. User can add one or more dated notes on a **lab panel** and on a **clinical test**  
2. Notes persist, list chronologically, and can be edited or deleted  
3. Visit/discussion date is distinct from collection/performed date  
4. UI makes clear these are **doctor discussion** notes vs entity metadata notes  
5. Empty state encourages “what to ask” / “what the doctor said” use cases  

### Related

- Labs, tests; procedures (possible later target); FR-016 symptoms (separate journal); co-pilot context if notes are later included intentionally  

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
| FR-011 | AI-maintained health profile (user-editable) | Co-pilot context; review-gated AI refresh |
| FR-012 | Drug interaction skill + med/supp UI flags | Safety-adjacent; e.g. doxy ↔ Zn/Mg |
| FR-013 | Vitals & body metrics time series | BP, weight, BMI, etc. — catalog TBD |
| FR-014 | Dashboard analyte trends | User-selected analyte sparklines/charts |
| FR-015 | Analyte results table + expandable history | Latest + past; links to lab/document |
| FR-016 | Symptoms log + AI chart cross-check | Log symptoms; AI vs labs/dx/meds |
| FR-017 | Doctor-visit notes on labs and tests | Dated discussion notes per lab/test |
