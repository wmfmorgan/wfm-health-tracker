# WFM Health Tracker — Phase 3 Design: AI Co-pilot, Personas & Chart Brief

**Date:** 2026-07-22  
**Status:** Approved for implementation planning  
**Parent:** [`2026-07-22-wfm-health-tracker-design.md`](./2026-07-22-wfm-health-tracker-design.md)  
**Related:** Phase 2 import design; [`FUTURE-REQUIREMENTS.md`](./FUTURE-REQUIREMENTS.md) (FR-001)  
**Audience:** Solo developer (personal use)

## 1. Purpose

Add an **AI co-pilot** over the personal health chart that:

1. Evaluates the chart through **selectable clinical personas** (GI, pharmacist, etc.).
2. Stores findings in a **Chart brief** as **persona-attributed views** that require **human review** before they become durable “memory.”
3. Supports **free chat** grounded in live chart data + accepted views only.
4. Reuses Phase 2 dual providers (Grok + Ollama) and privacy patterns.

This is **decision support for the user**, not medical advice and not a provider-facing EHR note unless the user chooses to share exports.

### 1.1 Goals

- Multi-lens evaluation without forcing a single AI consensus.
- Review-gated memory (same spirit as Phase 2 draft accept).
- Citations, versions, diffs, fact vs opinion labels.
- Tweakable built-in personas + user-created personas.
- Incremental skill surface: evaluate + chat first; med check / lab interpret / FR-001 next.

### 1.2 Non-goals (Phase 3 first ship)

- Multi-agent autonomous care teams that write memory without review.
- Silent merge of conflicting persona recommendations.
- OCR / PDF vision (still Phase 2 text path for import).
- Encrypted backup (Phase 4).
- Symptom journals, multi-user, mobile-native apps.
- Auto-mutation of clinical records (meds/labs) by AI.

### 1.3 Success criteria (first ship)

1. User can pick a persona and run **Evaluate** → draft persona view with citations and fact/opinion labels.
2. User can edit / accept / reject draft; accept creates a version; unreviewed drafts do not feed later evals or chat.
3. Multiple personas’ accepted views coexist; conflicts are not auto-resolved; optional topic-overlap flags.
4. Free chat uses live SQLite chart context + accepted views; chat never writes the brief unless user starts Evaluate (or explicitly accepts a “add to view?” proposal that opens draft flow).
5. Built-in personas can be tweaked (override prompt) and reset to seed defaults; custom personas supported.
6. Grok path requires per-request cloud confirm (context size disclosure).
7. All surfaces show assistive / not medical advice disclaimer.
8. Tests cover brief versioning, draft isolation, persona override, and skill context assembly without live network.

---

## 2. Decisions (locked in design discussion)

| Topic | Choice |
|-------|--------|
| Persona vs agent | **Persona = lens** (prompt + attributed view). Not multi-agent swarm. |
| Skills | App-specific skill runners (evaluate, chat; later med_check, lab_interpret, analyte_explain). |
| Memory shape | Chart brief: **shared snapshot** + **persona views** + optional **My plan**. |
| Conflicts | **Keep all views** (no silent merge); optional conflict flags; optional later Synthesize → My plan. |
| Who writes memory | **Explicit Evaluate skill only** for first ship; chat may propose, not auto-write. |
| First ship | Personas + Evaluate + Chart brief UI + free chat. |
| Built-in personas | Gastroenterologist, Primary care/internist, Clinical pharmacist, Functional/integrative medicine, Urologist, PhD Nutritionist, Cardiologist. |
| Persona edit | Built-ins **tweakable** (override); reset to default. |
| Extras | Citations (1), versions/rollback (2), diff (3), section regen (4), persona lens (5), no silent chat write (6), Grok confirm (7), fact vs opinion (9), size caps (10). |
| Safety disclaimer | Always present (#8 from discussion kept as hard constraint). |
| Architecture style | Skill runners + persona packs + versioned brief tables (Approach A). |

---

## 3. Architecture

### 3.1 Pipeline

```
Browser: /co-pilot · /brief · Settings personas
              │
              ▼
     Skill runner (evaluate | chat | …)
              │
    ┌─────────┴──────────┐
    ▼                    ▼
 Persona pack      Context builder
 (seed + override)  live chart + accepted views
    │                    │
    └─────────┬──────────┘
              ▼
     AIProvider (Grok | Ollama)  + cloud confirm if Grok
              ▼
     Structured/text result
              │
    evaluate ─┴─► draft persona_view  → human review → accept/version
    chat     ───► stream reply only (no memory write)
```

### 3.2 Modules (proposed)

| Module | Responsibility |
|--------|----------------|
| `src/server/ai/personas/*` | Seed definitions, resolve effective prompt |
| `src/server/ai/skills/evaluate.ts` | Full persona evaluation → draft view |
| `src/server/ai/skills/chat.ts` | Free Q&A with scoped context |
| `src/server/ai/context.ts` | Assemble live chart + accepted views (+ size caps) |
| `src/server/services/personas.ts` | CRUD overrides / custom personas |
| `src/server/services/brief.ts` | Snapshot, views, versions, accept/reject, diff helpers |
| `src/server/services/chat.ts` | Threads/messages persistence |
| `src/app/(app)/co-pilot/*` | Chat + evaluate entry |
| `src/app/(app)/brief/*` | Chart brief UI |
| Existing | `server/ai/router.ts`, grok, ollama, settings |

**Boundary:** Skills call services for DB; providers only do completion/stream. UI never builds prompts.

### 3.3 Two layers of truth

| Layer | Source | Used when |
|-------|--------|-----------|
| **A – Chart facts** | Live SQLite clinical tables | Always |
| **B – Reviewed intelligence** | Accepted persona views + accepted snapshot + My plan | Only if accepted |

Unreviewed drafts are never included in skill context.

---

## 4. Data model

### 4.1 `personas`

| Field | Notes |
|-------|--------|
| `id` | Stable slug for built-ins (`gi`, `pcp`, `pharmacist`, `functional`, `urologist`, `nutritionist`, `cardiologist`); nanoid for custom |
| `slug` | Unique URL-safe key |
| `name` | Display name |
| `specialty` | Short label |
| `description` | User-facing blurb |
| `system_prompt_default` | Seed text (for built-ins; may be re-seeded on migrate) |
| `system_prompt_override` | Nullable; if set, used instead of default |
| `is_builtin` | Boolean |
| `is_enabled` | Boolean; hide from pickers if false |
| `sort_order` | Display order |
| `created_at`, `updated_at` | |

**Resolve prompt:** `override ?? default`.  
**Reset:** set `override` null.

### 4.2 Built-in seed list (v1)

1. Gastroenterologist (`gi`)  
2. Primary care / internist (`pcp`)  
3. Clinical pharmacist (`pharmacist`)  
4. Functional / integrative medicine (`functional`)  
5. Urologist (`urologist`)  
6. PhD Nutritionist (`nutritionist`)  
7. Cardiologist (`cardiologist`)  

Defaults emphasize: evidence-aware language, UC/aging-aware where relevant, **not a substitute for care**, ask clarifying questions when data missing, separate facts vs recommendations.

### 4.3 `chart_brief_meta`

Single row (or key/value) for brief-level metadata: `updated_at`, optional title.

### 4.4 `brief_snapshots`

Shared factual snapshot of the chart (AI-assisted or structured summary).

| Field | Notes |
|-------|--------|
| `id` | |
| `status` | `draft` \| `accepted` \| `superseded` |
| `version` | Integer; increments on accept |
| `body_md` | Markdown snapshot |
| `citations_json` | Array of `{ entityType, entityId, label }` |
| `provider`, `model` | Provenance |
| `created_at` | |
| `accepted_at` | Nullable |

Only one **current accepted** snapshot (highest accepted version or flag).

### 4.5 `persona_views`

| Field | Notes |
|-------|--------|
| `id` | |
| `persona_id` | FK personas |
| `status` | `draft` \| `accepted` \| `rejected` \| `superseded` |
| `version` | Per-persona version on accept |
| `title` | Optional |
| `body_md` | Full evaluation markdown |
| `sections_json` | Optional structured sections (problems, meds, labs, open_questions, …) for section regen |
| `topics_json` | e.g. `["meds","diet","supplements","labs"]` for conflict flags |
| `citations_json` | Chart source refs |
| `fact_opinion_json` | Optional explicit split or markers documented in body |
| `provider`, `model` | |
| `parent_view_id` | Prior version when regenerating |
| `created_at`, `accepted_at` | |

**Rules:**

- At most one **draft** per persona at a time (replace or block with confirm).  
- Many **accepted** historical versions; one **current accepted** per persona.  
- New accept → previous current marked `superseded`.

### 4.6 `my_plan` (optional first ship: stub OK)

User-owned section; not written by Evaluate automatically.  
Later: Synthesize skill produces draft → user accepts into My plan.

### 4.7 `chat_threads` / `chat_messages`

| Thread | `id`, `title`, `persona_id` nullable, `created_at`, `updated_at` |
| Message | `id`, `thread_id`, `role` user\|assistant\|system, `content`, `provider`, `model`, `created_at` |

Chat history is **not** chart brief memory.

### 4.8 Conflict detection (lightweight)

When displaying brief: if two **current accepted** views share a topic tag and were updated independently, show informational flag: “Multiple personas have notes on: meds, supplements.”  
No automatic resolution.

---

## 5. Skills

### 5.1 First ship

#### `evaluate_persona`

**Input:** persona id, optional focus note, provider/model.  
**Context:** profile, allergies, active diagnoses, active meds/supplements, recent labs (capped), procedures/tests summaries as needed, **other personas’ current accepted views** (labeled as peer opinions, not facts).  
**Output (structured preferred):** markdown body + sections + topics + citations + fact/opinion separation.  
**Side effect:** write `persona_views` row `status=draft`.  
**Does not** accept itself.

#### `chat`

**Input:** message, thread id, optional persona lens, optional scope toggles.  
**Context:** live chart (scoped) + current accepted views + current accepted snapshot + My plan if any.  
**Output:** streamed or complete assistant message.  
**Side effect:** append messages only.  
**May** return a soft suggestion UI: “Start Evaluate as {persona} with this focus?” — does not write views.

### 5.2 Follow-on (designed, not first ship)

| Skill | Purpose |
|-------|---------|
| `med_check` | Interaction/allergy/duplicate-oriented review |
| `lab_interpret` | Panel/trend interpretation |
| `analyte_explain` | FR-001 lay definitions + health impact (cacheable) |
| `synthesize_plan` | Draft My plan from selected persona views |
| `update_snapshot` | Refresh shared factual snapshot with review |

Follow-on skills **must not** write persona views without explicit user confirmation (same as Evaluate).

### 5.3 Context builder rules

- Prefer structured fields over free notes when available.  
- Cap total context (configurable; e.g. soft char budget ~80–120k with truncate oldest lab details first).  
- Include disclaimer instruction in system prompt.  
- Temperature low for evaluate; moderate for chat.  
- Never include draft views in context.

---

## 6. User flows & UI

### 6.1 Routes

| Route | Purpose |
|-------|---------|
| `/co-pilot` | Chat + Evaluate entry |
| `/brief` | Chart brief: snapshot, persona views, conflicts, My plan |
| `/brief/views/[id]` | View detail, diff, accept/reject draft |
| `/settings` (extend) | Persona list, edit override, enable/disable, reset |
| Sidebar | **Co-pilot**, **Brief** |

### 6.2 Evaluate flow

1. Co-pilot or Brief → **Evaluate as…** → pick persona (+ optional focus).  
2. If Grok → cloud confirm (approx context size).  
3. Run skill → draft view.  
4. Redirect to draft review: body, citations, fact/opinion, topics.  
5. User edits markdown/sections → **Accept** / **Reject** / **Regenerate section**.  
6. Accept → version++, supersede prior current accepted for that persona.

### 6.3 Brief UI

- Snapshot card (current accepted + link to drafts).  
- List of personas with status badge (has accepted / has draft / empty).  
- Expand view: body, citations, versions dropdown, Diff vs previous accepted.  
- Conflict strip when topic overlap across personas.  
- My plan card (edit manual; synthesize later).  
- Export markdown (`chart-brief.md` aggregate).

### 6.4 Chat UI

- Thread list + transcript.  
- Controls: provider, model, optional persona lens, scope checkboxes (meds, labs, …).  
- Disclaimer footer always.  
- Optional chip: “Run Evaluate with this thread’s persona.”

### 6.5 Persona settings

- Table of built-ins + custom.  
- Edit: name (custom), description, system prompt override, enabled.  
- **Reset to default** for built-ins.  
- Create custom persona (name + prompt).  
- Cannot delete built-ins (disable only); custom can delete if no views or cascade with confirm.

---

## 7. Privacy & safety

| Rule | Detail |
|------|--------|
| Disclaimer | Always visible; outputs assistive only |
| Grok | Per-request confirm with rough token/char estimate of payload |
| Ollama | Local; no cloud confirm |
| Logs | No full clinical payloads; ids + skill + status |
| Memory integrity | Draft ≠ memory; accept is explicit |
| Conflicts | Never auto-merge clinical recommendations |
| Chart writes | AI does not create/update meds/labs/diagnoses records in Phase 3 |

---

## 8. Error handling

| Situation | Behavior |
|-----------|----------|
| Provider down / missing key | Fail skill with actionable message; no draft row or mark failed attempt |
| Context too large | Truncate with notice in draft/chat; or fail with “narrow scope” |
| Empty chart | Evaluate still runs; notes limited data |
| Concurrent draft | Confirm replace existing draft |
| Invalid override prompt empty | Validation error |

---

## 9. Testing strategy

| Layer | Coverage |
|-------|----------|
| Unit | Prompt resolve (override vs default); context size cap; topic conflict helper; fact/opinion markers parse |
| Integration | Evaluate → draft isolated from chat context; accept → version + supersede; reject leaves no current; two personas both accepted; chat context excludes drafts |
| AI | Mock providers only in CI |
| Manual UAT | Real Grok + Ollama evaluate as GI vs Functional; confirm both views retained; tweak persona prompt and re-run |

---

## 10. Delivery slices

1. **Schema + persona seed + settings tweak UI**  
2. **Context builder + evaluate skill + draft/accept/version**  
3. **Brief UI** (list, detail, diff, conflict flags, export)  
4. **Chat skill + threads UI**  
5. **Cloud confirm, disclaimers, polish**  
6. *(Later milestone)* med_check, lab_interpret, FR-001, synthesize_plan  

---

## 11. Risks

| Risk | Mitigation |
|------|------------|
| User treats brief as medical order | Strong disclaimers; fact vs opinion labels |
| Conflicting advice confuses | Show both; conflict flags; My plan is user-owned |
| Context leaks PHI to cloud | Grok confirm; minimal context; local default |
| Prompt override jailbreaks safety | Keep base safety wrapper around user override |
| Scope creep into full agent framework | Stick to skill runners + review gates |

---

## 12. Open items deferred (not blocking)

- Exact default prompt text per persona (finalize at implement; keep editable).  
- Streaming vs non-streaming chat (prefer stream if easy with Grok/Ollama).  
- Whether snapshot auto-updates on evaluate or only via separate skill (recommend: evaluate may refresh snapshot **as draft** only if user opts in; default first ship: evaluate writes **persona view only**).  

**Decision for first ship:** Evaluate writes **persona view only**. Shared snapshot can be a simple structured “at a glance” generated from DB without AI, or a later skill.

---

## 13. Next step

Create implementation plan at `docs/superpowers/plans/2026-07-22-wfm-health-tracker-phase3.md`, then execute first-ship slices.
