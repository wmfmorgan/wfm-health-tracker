# WFM Health Tracker Phase 3 (AI Co-pilot) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an AI co-pilot with tweakable clinical personas, review-gated persona chart-brief views (multi-lens, no auto-merge), and free chat grounded only in live chart facts plus accepted views.

**Architecture:** Skill runners (`evaluate_persona`, `chat`) + persona packs + versioned `persona_views` / optional DB snapshot helper; reuse Phase 2 `AIProvider` (Grok + Ollama). Draft views never enter skill context until accepted. Chat never writes brief memory.

**Tech Stack:** Existing Next.js 15, Drizzle, SQLite, Zod, Vitest, `openai` SDK (xAI), Ollama HTTP.

**Spec:** `docs/superpowers/specs/2026-07-22-wfm-health-tracker-phase3-design.md`

**Out of this plan (later):** med_check, lab_interpret, FR-001, synthesize_plan, OCR.

---

## File map

```
src/server/db/schema.ts              # personas, persona_views, my_plan, chat_threads, chat_messages
src/server/db/migrate.ts             # CREATE TABLE + seedPersonas()

src/server/ai/types.ts               # + completeText()
src/server/ai/grok.ts                # implement completeText
src/server/ai/ollama.ts              # implement completeText
src/server/ai/personas/seed.ts       # built-in prompt defaults
src/server/ai/personas/resolve.ts    # effective system prompt + safety wrapper
src/server/ai/context.ts             # buildChartContext()
src/server/ai/skills/evaluate.ts
src/server/ai/skills/chat.ts
src/server/ai/safety.ts              # DISCLAIMER constants

src/lib/validation/persona.ts
src/lib/validation/brief.ts
src/lib/validation/chat.ts
src/lib/brief/diff.ts                # simple line diff helper
src/lib/brief/conflicts.ts           # topic overlap flags

src/server/services/personas.ts
src/server/services/brief.ts
src/server/services/chat.ts

src/server/actions/personas.ts
src/server/actions/brief.ts
src/server/actions/chat.ts
src/server/actions/evaluate.ts

src/app/api/co-pilot/evaluate/route.ts   # optional long-running evaluate
src/app/api/co-pilot/chat/route.ts       # chat completion (non-stream first OK)

src/app/(app)/co-pilot/page.tsx
src/app/(app)/brief/page.tsx
src/app/(app)/brief/views/[id]/page.tsx
src/app/(app)/settings/personas/…        # or section on settings page

src/components/co-pilot/*
src/components/brief/*
src/components/layout/sidebar-nav.tsx    # Co-pilot, Brief

README.md
tests/unit/context.test.ts
tests/unit/persona-resolve.test.ts
tests/unit/brief-conflicts.test.ts
tests/unit/brief-diff.test.ts
tests/integration/personas.test.ts
tests/integration/brief.test.ts
tests/integration/chat-context.test.ts
```

---

### Task 1: Schema + migrations for personas, views, chat

**Files:**
- Modify: `src/server/db/schema.ts`
- Modify: `src/server/db/migrate.ts`
- Test: `tests/integration/personas.test.ts` (smoke: tables exist)

- [ ] **Step 1: Append Drizzle tables** to `schema.ts`:

```ts
export const personas = sqliteTable("personas", {
  id: text("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  specialty: text("specialty"),
  description: text("description"),
  systemPromptDefault: text("system_prompt_default").notNull(),
  systemPromptOverride: text("system_prompt_override"),
  isBuiltin: integer("is_builtin", { mode: "boolean" }).notNull().default(false),
  isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const personaViews = sqliteTable("persona_views", {
  id: text("id").primaryKey(),
  personaId: text("persona_id")
    .notNull()
    .references(() => personas.id),
  status: text("status").notNull(), // draft | accepted | rejected | superseded
  version: integer("version").notNull().default(0),
  title: text("title"),
  bodyMd: text("body_md").notNull(),
  sectionsJson: text("sections_json"), // JSON string
  topicsJson: text("topics_json"),
  citationsJson: text("citations_json"),
  factOpinionJson: text("fact_opinion_json"),
  provider: text("provider"),
  model: text("model"),
  parentViewId: text("parent_view_id"),
  focusNote: text("focus_note"),
  createdAt: text("created_at").notNull(),
  acceptedAt: text("accepted_at"),
  updatedAt: text("updated_at").notNull(),
});

export const myPlan = sqliteTable("my_plan", {
  id: text("id").primaryKey(), // "default"
  bodyMd: text("body_md").notNull().default(""),
  updatedAt: text("updated_at").notNull(),
});

export const chatThreads = sqliteTable("chat_threads", {
  id: text("id").primaryKey(),
  title: text("title"),
  personaId: text("persona_id").references(() => personas.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const chatMessages = sqliteTable("chat_messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .references(() => chatThreads.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // user | assistant | system
  content: text("content").notNull(),
  provider: text("provider"),
  model: text("model"),
  createdAt: text("created_at").notNull(),
});
```

- [ ] **Step 2: Mirror `CREATE TABLE IF NOT EXISTS` in `migrate.ts`** (snake_case columns, FKs). Call `seedBuiltinPersonas()` at end of migrate (idempotent upsert by id).

- [ ] **Step 3: Smoke test** — `useFreshDb()`, select from `personas` and `persona_views` without throw; after seed, expect ≥7 personas.

- [ ] **Step 4: Commit**

```bash
git add src/server/db/schema.ts src/server/db/migrate.ts tests/integration/personas.test.ts
git commit -m "feat(db): Phase 3 personas, views, and chat tables"
```

---

### Task 2: Persona seed data + personas service

**Files:**
- Create: `src/server/ai/personas/seed.ts`
- Create: `src/server/ai/personas/resolve.ts`
- Create: `src/server/ai/safety.ts`
- Create: `src/lib/validation/persona.ts`
- Create: `src/server/services/personas.ts`
- Modify: `migrate.ts` to import seed
- Test: `tests/unit/persona-resolve.test.ts`, extend `tests/integration/personas.test.ts`

- [ ] **Step 1: Safety constant**

```ts
// src/server/ai/safety.ts
export const MEDICAL_DISCLAIMER =
  "Assistive decision support only — not medical advice, diagnosis, or treatment. Verify with a licensed clinician.";

export const SAFETY_SYSTEM_SUFFIX = `
You are an assistive tool for a personal health chart. Always:
- Separate FACTS (from chart data) from OPINIONS/recommendations.
- Cite chart sources by name/date when possible.
- Never claim to replace a licensed clinician.
- If data is missing, say so and ask what is needed.
- Do not invent lab values, meds, or diagnoses not present in the chart context.
`.trim();
```

- [ ] **Step 2: Seed built-ins** — array of 7 personas with short specialty-specific `systemPromptDefault` (GI, PCP, pharmacist, functional, urologist, nutritionist, cardiologist). IDs = slugs listed in spec.

- [ ] **Step 3: `seedBuiltinPersonas()`** in migrate or personas service: insert if missing; for built-ins, **refresh `system_prompt_default` only** (do not wipe override).

- [ ] **Step 4: resolveEffectivePrompt(persona)**

```ts
export function resolveEffectivePrompt(p: {
  systemPromptDefault: string;
  systemPromptOverride: string | null;
}): string {
  const core = (p.systemPromptOverride?.trim() || p.systemPromptDefault).trim();
  return `${core}\n\n${SAFETY_SYSTEM_SUFFIX}`;
}
```

Unit test: override wins; empty override falls back; safety suffix always present.

- [ ] **Step 5: Service API**

```ts
listPersonas({ enabledOnly?: boolean })
getPersona(id)
createCustomPersona({ name, specialty?, description?, systemPromptDefault })
updatePersona(id, { name?, description?, systemPromptOverride?, isEnabled?, specialty? })
resetPersonaPrompt(id) // builtin only: override = null
deleteCustomPersona(id) // reject if isBuiltin
```

- [ ] **Step 6: Integration tests** for override/reset/create/disable.

- [ ] **Step 7: Commit**

```bash
git commit -m "feat: persona seed, resolve, and settings service"
```

---

### Task 3: Chart context builder

**Files:**
- Create: `src/server/ai/context.ts`
- Test: `tests/unit/context.test.ts` + integration with fresh DB data

- [ ] **Step 1: Types**

```ts
export type ChartContextScope = {
  profile?: boolean;
  allergies?: boolean;
  diagnoses?: boolean;
  medications?: boolean;
  supplements?: boolean;
  labs?: boolean; // recent N panels
  tests?: boolean;
  procedures?: boolean;
  acceptedViews?: boolean;
  myPlan?: boolean;
};

export type BuiltContext = {
  text: string;
  charCount: number;
  truncated: boolean;
  citations: Array<{ entityType: string; entityId: string; label: string }>;
};
```

- [ ] **Step 2: `buildChartContext(opts: { scope: ChartContextScope; maxChars?: number; excludePersonaId?: string })`**

- Load from existing services: profile, allergies, diagnoses (active/chronic), meds active, supplements active, recent lab panels+results (e.g. last 5 panels), tests/procedures recent.
- Load **current accepted** persona views via brief service (or query status=accepted and not superseded — use helper `listCurrentAcceptedViews()`).
- Format as markdown sections. Label peer views: `## Peer persona view (accepted): {name}` with warning “opinion, not chart fact”.
- Apply `maxChars` default **100_000**: truncate labs first, then older peer views; set `truncated: true`.
- Collect lightweight citations for entities included.

- [ ] **Step 3: Tests** — seed minimal chart rows; assert meds appear; assert draft views excluded; assert truncation flag when maxChars small.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: chart context builder for co-pilot skills"
```

---

### Task 4: Brief service (views, accept, reject, versions, conflicts, my plan)

**Files:**
- Create: `src/lib/validation/brief.ts`
- Create: `src/lib/brief/diff.ts`
- Create: `src/lib/brief/conflicts.ts`
- Create: `src/server/services/brief.ts`
- Test: `tests/integration/brief.test.ts`, unit tests for diff/conflicts

- [ ] **Step 1: Zod** for evaluate output shape:

```ts
export const evaluateResultSchema = z.object({
  title: z.string().optional(),
  bodyMd: z.string().min(1),
  sections: z.record(z.string(), z.string()).optional(),
  topics: z.array(z.string()).default([]),
  citations: z.array(z.object({
    entityType: z.string(),
    entityId: z.string(),
    label: z.string(),
  })).default([]),
  facts: z.array(z.string()).default([]),
  opinions: z.array(z.string()).default([]),
});
```

- [ ] **Step 2: Brief API**

```ts
createDraftView({ personaId, bodyMd, sections?, topics?, citations?, facts?, opinions?, provider, model, focusNote?, parentViewId?, replaceExistingDraft?: boolean })
getView(id)
listViewsForPersona(personaId)
getCurrentAcceptedView(personaId)
listCurrentAcceptedViews()
updateDraftView(id, { bodyMd, title?, topics?, ... })
acceptView(id) // version = prev+1 or 1; supersede prior accepted for persona; set acceptedAt
rejectView(id)
listVersionHistory(personaId)
getMyPlan() / saveMyPlan(bodyMd)
detectTopicConflicts(views): { topic: string; personaIds: string[] }[]
```

Accept rules from spec strictly. Only one draft per persona: if draft exists and `replaceExistingDraft`, delete/reject old draft first.

- [ ] **Step 3: `simpleLineDiff(a, b): string`** — unified-ish or side-by-side line list (keep dependency-free).

- [ ] **Step 4: Tests**

1. Accept creates version 1; second accept → version 2, first superseded.  
2. Draft excluded from `listCurrentAcceptedViews`.  
3. Two personas accepted with shared topic → conflict entry.  
4. Reject draft does not create accepted.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: chart brief persona views with review and versioning"
```

---

### Task 5: Extend AIProvider with completeText + evaluate skill

**Files:**
- Modify: `src/server/ai/types.ts`, `grok.ts`, `ollama.ts`
- Create: `src/server/ai/skills/evaluate.ts`
- Create: `src/server/actions/evaluate.ts`
- Create: `src/app/api/co-pilot/evaluate/route.ts` (POST JSON)
- Test: unit with FakeProvider

- [ ] **Step 1: Extend interface**

```ts
export interface AIProvider {
  readonly id: AIProviderId;
  completeJson(input: { system: string; user: string; model: string }): Promise<unknown>;
  completeText(input: { system: string; user: string; model: string }): Promise<string>;
}
```

Implement `completeText` on Grok (no json response_format) and Ollama (omit format or format without json).

- [ ] **Step 2: Evaluate skill**

```ts
export async function runEvaluatePersona(opts: {
  personaId: string;
  focusNote?: string;
  provider: "grok" | "ollama";
  model: string;
  cloudConfirmed?: boolean; // required true if grok
  replaceExistingDraft?: boolean;
  deps?: { provider?: AIProvider; buildContext?: typeof buildChartContext };
}): Promise<{ viewId: string }>
```

Logic:

1. If provider grok && !cloudConfirmed → throw `CLOUD_CONFIRM_REQUIRED`.  
2. Load persona; resolve prompt.  
3. `buildChartContext` with full clinical scope + acceptedViews (exclude this persona’s own view optional or include prior accepted as “your previous accepted view”).  
4. User message includes focus note + context text + JSON schema instructions for `evaluateResultSchema`.  
5. `completeJson` → parse/repair once (same pattern as extract-labs).  
6. `createDraftView(...)`.  
7. Return viewId.

- [ ] **Step 3: API route** `POST /api/co-pilot/evaluate` — auth, body validation, call skill, return `{ ok, viewId }` or `{ ok:false, code:'CLOUD_CONFIRM_REQUIRED', charCount }`.

- [ ] **Step 4: Server actions** for accept/reject/update draft (revalidate `/brief`).

- [ ] **Step 5: FakeProvider test** writes draft; draft not in listCurrentAcceptedViews; accept then appears.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat: evaluate persona skill with draft view creation"
```

---

### Task 6: Brief UI

**Files:**
- Modify: `sidebar-nav.tsx` — add Brief, Co-pilot (Co-pilot page can stub until Task 8)
- Create: `src/app/(app)/brief/page.tsx`
- Create: `src/app/(app)/brief/views/[id]/page.tsx`
- Create: `src/components/brief/*` as needed
- Create: evaluate launch form component used from brief

- [ ] **Step 1: `/brief` page** — list personas with badges (draft / accepted vN / empty); conflict strip; My plan textarea + save; button Evaluate as…; export markdown link or client download of aggregated brief.

- [ ] **Step 2: `/brief/views/[id]`** — show body (markdown as pre-wrap or simple render), facts/opinions lists, citations, topics, provider/model. If draft: edit body, Accept, Reject. If accepted: version history links, Diff vs previous accepted using `simpleLineDiff`.

- [ ] **Step 3: Evaluate form** — persona select, focus note, provider/model (reuse ollama list pattern from settings), Grok confirm step (show charCount from dry-run or from API error).

**Dry-run option:** export `estimateEvaluateContextChars(personaId)` from skill/context for confirm UI without calling AI.

- [ ] **Step 4: Disclaimer** on all brief pages.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: Chart brief UI for multi-persona reviewed views"
```

---

### Task 7: Chat service + skill

**Files:**
- Create: `src/server/services/chat.ts`
- Create: `src/server/ai/skills/chat.ts`
- Create: `src/server/actions/chat.ts`
- Create: `src/app/api/co-pilot/chat/route.ts`
- Test: `tests/integration/chat-context.test.ts`

- [ ] **Step 1: Chat service**

```ts
createThread({ title?, personaId? })
listThreads()
getThread(id) // + messages ordered
addMessage({ threadId, role, content, provider?, model? })
deleteThread(id)
```

- [ ] **Step 2: `runChatTurn`**

```ts
export async function runChatTurn(opts: {
  threadId: string;
  userMessage: string;
  personaId?: string | null;
  provider: "grok" | "ollama";
  model: string;
  scope: ChartContextScope;
  cloudConfirmed?: boolean;
  deps?: { provider?: AIProvider };
}): Promise<{ assistantMessage: string }>
```

1. Grok confirm gate.  
2. Persist user message.  
3. Build context (scope); system = safety + optional persona lens + “You may suggest running Evaluate but cannot write chart brief memory.”  
4. Include last N messages (e.g. 20) in prompt.  
5. `completeText` → persist assistant message.  
6. Return text.

**Important:** no calls to `createDraftView`.

- [ ] **Step 3: Test** that after chat, persona_views count unchanged; context includes accepted view text.

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: co-pilot chat skill with chart context, no memory writes"
```

---

### Task 8: Co-pilot UI

**Files:**
- Create: `src/app/(app)/co-pilot/page.tsx`
- Create: `src/components/co-pilot/chat-panel.tsx`
- Create: `src/components/co-pilot/evaluate-panel.tsx` (or reuse brief form)

- [ ] **Step 1: Page layout** — tabs or split: **Chat** | **Evaluate**.

- [ ] **Step 2: Chat panel** — thread list, messages, composer, provider/model, persona lens select, scope checkboxes, Grok confirm modal, disclaimer, link “Open Evaluate with this persona.”

- [ ] **Step 3: Evaluate panel** — same as brief evaluate; on success navigate to `/brief/views/{id}`.

- [ ] **Step 4: Match existing zinc clinical UI.**

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: Co-pilot UI for chat and persona evaluation"
```

---

### Task 9: Persona settings UI + README

**Files:**
- Extend settings page or `/settings/personas`
- Create: `src/server/actions/personas.ts`
- Modify: `README.md`

- [ ] **Step 1: Personas management UI** — list, enable toggle, edit override textarea, reset default, create custom, delete custom.

- [ ] **Step 2: README** — Phase 3 section: Co-pilot, Brief, personas, review-gated memory, multi-view conflicts, Grok confirm, disclaimers. Move med check / FR-001 to later.

- [ ] **Step 3: Commit**

```bash
git commit -m "feat: persona settings UI and Phase 3 docs"
```

---

### Task 10: Final verification

- [ ] **Step 1: Run**

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

- [ ] **Step 2: Fix failures** (including any FakeProvider / completeText interface breakages in Phase 2 tests — update fakes).

- [ ] **Step 3: Commit fixes if any**

```bash
git commit -m "fix: Phase 3 verification cleanups"
```

---

## Spec coverage checklist

| Requirement | Task |
|-------------|------|
| Personas built-in + tweak/reset/custom | 2, 9 |
| Evaluate → draft only | 5 |
| Accept/reject/version/supersede | 4, 6 |
| Multi-persona coexistence / no auto-merge | 4, 6 |
| Topic conflict flags | 4, 6 |
| Citations / facts vs opinions | 4, 5, 6 |
| Diff vs previous | 4, 6 |
| Section fields in schema (regen can be minimal: re-run evaluate with focus) | 4–5; full section regen may be “re-evaluate with focus note” in first ship |
| Chat uses live + accepted only | 3, 7, 8 |
| Chat does not write memory | 7 |
| Grok cloud confirm | 5, 7, 8 |
| Size caps / truncation | 3 |
| Disclaimers | 2, 6, 8 |
| My plan manual | 4, 6 |
| Sidebar routes | 6, 8 |
| Tests without live network | 2–7, 10 |

**Section regenerate:** First ship implements **re-run Evaluate with focus note** (“Regenerate focusing on: meds section”). Full surgical section rewrite is optional polish if time remains.

---

## Placeholder / consistency self-check

- Status enums: `draft | accepted | rejected | superseded`  
- Provider ids: `grok | ollama`  
- `completeText` added to all providers + test fakes  
- Draft views never in `buildChartContext`  
- Safety suffix always applied outside user override  

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-22-wfm-health-tracker-phase3.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — implement in this session with checkpoints  

**Which approach?**
