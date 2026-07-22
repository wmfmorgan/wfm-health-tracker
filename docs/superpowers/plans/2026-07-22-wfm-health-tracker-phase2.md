# WFM Health Tracker Phase 2 (AI Lab PDF Import) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship AI-assisted lab PDF import: upload PDF → text extract → Grok/Ollama draft panels → review/edit/accept into the records hub with source PDF linked.

**Architecture:** Import jobs + normalized draft lab tables in SQLite; dual AI provider router (xAI Grok + Ollama); text-layer-only PDF parse; dedicated `/import` UI; explicit accept commits via existing labs/document services.

**Tech Stack:** Existing Next.js 15 + Drizzle + SQLite + Zod + Vitest; add `openai` (xAI-compatible), `pdf-parse` (or equivalent) for text extraction.

**Spec:** `docs/superpowers/specs/2026-07-22-wfm-health-tracker-phase2-design.md`

---

## File map

```
.env.example                          # + XAI_API_KEY
README.md                             # Phase 2 docs
package.json                          # + openai, pdf-parse (+ types)

src/server/db/schema.ts               # import_jobs, draft_lab_panels, draft_lab_results
src/server/db/migrate.ts              # CREATE TABLE for new tables

src/lib/pdf-text.ts                   # text extract + thresholds
src/lib/validation/import.ts          # AI extract schema, job provider enums
src/lib/validation/ai-settings.ts     # settings form schema
src/lib/ai/flags.ts                   # normalize flag strings

src/server/ai/types.ts
src/server/ai/grok.ts
src/server/ai/ollama.ts
src/server/ai/router.ts
src/server/ai/extract-labs.ts

src/server/services/settings.ts       # app_settings get/set + AI defaults
src/server/services/imports.ts        # job lifecycle, drafts, accept/reject
src/server/services/labs.ts           # optional source= on create
src/server/services/documents.ts      # block delete when open import job

src/server/actions/imports.ts
src/server/actions/settings.ts        # save AI settings

src/app/api/import/upload/route.ts    # multipart PDF → start job
src/app/(app)/import/page.tsx
src/app/(app)/import/new/page.tsx
src/app/(app)/import/[id]/page.tsx
src/components/import/cloud-confirm.tsx
src/components/import/draft-panel-card.tsx
src/components/layout/sidebar-nav.tsx  # + Import link
src/app/(app)/settings/page.tsx       # real AI config section

tests/unit/pdf-text.test.ts
tests/unit/extract-schema.test.ts
tests/unit/flags.test.ts
tests/integration/imports.test.ts
tests/integration/settings.test.ts
```

---

### Task 1: Schema + migrations for import drafts

**Files:**
- Modify: `src/server/db/schema.ts`
- Modify: `src/server/db/migrate.ts`
- Test: `tests/integration/imports.test.ts` (scaffold + table smoke)

- [ ] **Step 1: Add tables to `schema.ts`**

Append after `analytes`:

```ts
export const importJobs = sqliteTable("import_jobs", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id),
  status: text("status").notNull(),
  // pending | awaiting_cloud_confirm | extracting | ready | failed | discarded | completed
  provider: text("provider").notNull(), // grok | ollama
  model: text("model").notNull(),
  errorMessage: text("error_message"),
  extractedCharCount: integer("extracted_char_count"),
  cloudConfirmedAt: text("cloud_confirmed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const draftLabPanels = sqliteTable("draft_lab_panels", {
  id: text("id").primaryKey(),
  importJobId: text("import_job_id")
    .notNull()
    .references(() => importJobs.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  name: text("name").notNull(),
  collectedOn: text("collected_on"),
  facility: text("facility"),
  status: text("status").notNull().default("final"),
  notes: text("notes"),
  reviewStatus: text("review_status").notNull().default("pending"),
  // pending | accepted | rejected
  committedEntityId: text("committed_entity_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const draftLabResults = sqliteTable("draft_lab_results", {
  id: text("id").primaryKey(),
  draftPanelId: text("draft_panel_id")
    .notNull()
    .references(() => draftLabPanels.id, { onDelete: "cascade" }),
  sortOrder: integer("sort_order").notNull().default(0),
  analyteName: text("analyte_name").notNull(),
  value: text("value"),
  unit: text("unit"),
  refLow: text("ref_low"),
  refHigh: text("ref_high"),
  flag: text("flag"),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
```

- [ ] **Step 2: Add `CREATE TABLE IF NOT EXISTS` in `migrate.ts`**

Mirror column names (snake_case SQL). Include FKs. Place after `analytes` create.

- [ ] **Step 3: Write failing smoke test**

`tests/integration/imports.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { useFreshDb, getDb } from "../helpers/test-db";
import { importJobs } from "@/server/db/schema";

useFreshDb();

describe("import_jobs schema", () => {
  it("can insert an import job row", () => {
    // Will need a document first — temporarily skip full insert until Task 3
    // For this step: just ensure select from import_jobs does not throw
    const rows = getDb().select().from(importJobs).all();
    expect(rows).toEqual([]);
  });
});
```

- [ ] **Step 4: Run test**

```bash
npm test -- tests/integration/imports.test.ts
```

Expected: PASS (empty table).

- [ ] **Step 5: Commit**

```bash
git add src/server/db/schema.ts src/server/db/migrate.ts tests/integration/imports.test.ts
git commit -m "feat(db): add import job and draft lab tables for Phase 2"
```

---

### Task 2: AI settings service

**Files:**
- Create: `src/lib/validation/ai-settings.ts`
- Create: `src/server/services/settings.ts`
- Create: `tests/integration/settings.test.ts`

- [ ] **Step 1: Validation schema**

`src/lib/validation/ai-settings.ts`:

```ts
import { z } from "zod";

export const aiProviderSchema = z.enum(["grok", "ollama"]);

export const aiSettingsSchema = z.object({
  defaultProvider: aiProviderSchema.default("ollama"),
  grokModel: z.string().min(1).max(100).default("grok-4.5"),
  ollamaBaseUrl: z.string().url().default("http://127.0.0.1:11434"),
  ollamaModel: z.string().min(1).max(100).default("llama3.2"),
});

export type AiSettings = z.infer<typeof aiSettingsSchema>;

export const AI_SETTING_KEYS = {
  defaultProvider: "ai.default_provider",
  grokModel: "ai.grok_model",
  ollamaBaseUrl: "ai.ollama_base_url",
  ollamaModel: "ai.ollama_model",
} as const;
```

- [ ] **Step 2: Settings service**

`src/server/services/settings.ts`:

```ts
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { appSettings } from "@/server/db/schema";
import {
  AI_SETTING_KEYS,
  aiSettingsSchema,
  type AiSettings,
} from "@/lib/validation/ai-settings";

function getRaw(key: string): string | undefined {
  bootstrapDb();
  return getDb().select().from(appSettings).where(eq(appSettings.key, key)).get()?.value;
}

function setRaw(key: string, value: string) {
  bootstrapDb();
  getDb()
    .insert(appSettings)
    .values({ key, value })
    .onConflictDoUpdate({ target: appSettings.key, set: { value } })
    .run();
}

export function getAiSettings(): AiSettings {
  const parsed = aiSettingsSchema.safeParse({
    defaultProvider: getRaw(AI_SETTING_KEYS.defaultProvider) ?? undefined,
    grokModel: getRaw(AI_SETTING_KEYS.grokModel) ?? undefined,
    ollamaBaseUrl: getRaw(AI_SETTING_KEYS.ollamaBaseUrl) ?? undefined,
    ollamaModel: getRaw(AI_SETTING_KEYS.ollamaModel) ?? undefined,
  });
  return parsed.success ? parsed.data : aiSettingsSchema.parse({});
}

export function saveAiSettings(input: AiSettings) {
  const data = aiSettingsSchema.parse(input);
  setRaw(AI_SETTING_KEYS.defaultProvider, data.defaultProvider);
  setRaw(AI_SETTING_KEYS.grokModel, data.grokModel);
  setRaw(AI_SETTING_KEYS.ollamaBaseUrl, data.ollamaBaseUrl);
  setRaw(AI_SETTING_KEYS.ollamaModel, data.ollamaModel);
  return data;
}

export function hasXaiApiKey(): boolean {
  return Boolean(process.env.XAI_API_KEY?.trim());
}
```

- [ ] **Step 3: Test**

```ts
import { describe, it, expect } from "vitest";
import { useFreshDb } from "../helpers/test-db";
import { getAiSettings, saveAiSettings } from "@/server/services/settings";

useFreshDb();

describe("settings service", () => {
  it("returns defaults then persists overrides", () => {
    expect(getAiSettings().defaultProvider).toBe("ollama");
    saveAiSettings({
      defaultProvider: "grok",
      grokModel: "grok-4.5",
      ollamaBaseUrl: "http://127.0.0.1:11434",
      ollamaModel: "llama3.2",
    });
    expect(getAiSettings().defaultProvider).toBe("grok");
  });
});
```

- [ ] **Step 4: Run tests and commit**

```bash
npm test -- tests/integration/settings.test.ts
git add src/lib/validation/ai-settings.ts src/server/services/settings.ts tests/integration/settings.test.ts
git commit -m "feat: AI settings via app_settings for extract providers"
```

---

### Task 3: Import service — jobs, drafts, accept/reject (no live AI)

**Files:**
- Create: `src/lib/validation/import.ts`
- Create: `src/server/services/imports.ts`
- Modify: `src/server/services/labs.ts` (accept `source` on create)
- Modify: `src/server/services/documents.ts` (block delete when open job)
- Modify: `tests/integration/imports.test.ts`

- [ ] **Step 1: Validation helpers**

`src/lib/validation/import.ts`:

```ts
import { z } from "zod";
import { labResultSchema } from "@/lib/validation/lab";

export const importProviderSchema = z.enum(["grok", "ollama"]);
export const importJobStatusSchema = z.enum([
  "pending",
  "awaiting_cloud_confirm",
  "extracting",
  "ready",
  "failed",
  "discarded",
  "completed",
]);
export const draftReviewStatusSchema = z.enum(["pending", "accepted", "rejected"]);

export const extractedLabResultSchema = labResultSchema;
export const extractedLabPanelSchema = z.object({
  name: z.string().min(1).max(300),
  collectedOn: z.string().optional().nullable(),
  facility: z.string().max(200).optional().nullable(),
  status: z.enum(["pending", "final"]).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  results: z.array(extractedLabResultSchema).default([]),
});
export const extractedLabsSchema = z.object({
  panels: z.array(extractedLabPanelSchema),
});
export type ExtractedLabs = z.infer<typeof extractedLabsSchema>;
```

- [ ] **Step 2: Allow `source` on lab create**

In `createLabPanel`, change insert `source: "manual"` to:

```ts
source: panelInput.source === "pdf_import" ? "pdf_import" : "manual",
```

Extend `labPanelSchema` in `src/lib/validation/lab.ts`:

```ts
source: z.enum(["manual", "pdf_import"]).optional(),
```

- [ ] **Step 3: Implement `imports.ts` core API**

Required functions (implement fully):

```ts
// signatures
createImportJob(opts: {
  documentId: string;
  provider: "grok" | "ollama";
  model: string;
}): ImportJobRow

getImportJob(id: string): ImportJobWithDrafts | undefined
listImportJobs(): Array<ImportJobRow & { filename?: string }>

setJobStatus(id, status, patch?: { errorMessage?, extractedCharCount?, cloudConfirmedAt? })

writeDraftsFromExtracted(jobId: string, extracted: ExtractedLabs): void

updateDraftPanel(draftPanelId, panelFields, results: LabResultInput[]): void

acceptDraftPanel(draftPanelId: string): { labPanelId: string }
rejectDraftPanel(draftPanelId: string): void
acceptAllPending(jobId: string): void
discardImportJob(jobId: string): void

hasOpenImportJobForDocument(documentId: string): boolean
// open = status in pending | awaiting_cloud_confirm | extracting | ready

recomputeJobCompletion(jobId: string): void
// if no pending drafts and status was ready → completed
```

**Accept panel transaction:**

1. Load draft panel + results + parent job + document id  
2. Validate with `labPanelSchema` / `labResultSchema`  
3. `createLabPanel({ ...fields, source: "pdf_import" }, results)`  
4. `linkDocument(job.documentId, "lab_panel", panel.id)`  
5. Set draft `reviewStatus=accepted`, `committedEntityId=panel.id`  
6. `recomputeJobCompletion`

**createImportJob:** insert status `pending`.

Use `bootstrapDb`, `newId`, `nowIso`, `getSqlite().transaction` like labs service.

- [ ] **Step 4: Block document delete**

At start of `deleteDocument(id)`:

```ts
if (hasOpenImportJobForDocument(id)) {
  throw new Error(
    "Cannot delete document while an open AI import references it. Complete or discard the import first.",
  );
}
```

Avoid circular imports: put `hasOpenImportJobForDocument` in imports.ts; documents.ts imports it (or query `import_jobs` inline in documents.ts to keep deps simple — **prefer inline query in documents.ts** to avoid cycle).

- [ ] **Step 5: Integration tests**

```ts
// pseudo — write real assertions
it("accepts draft panel into live labs with document link and source pdf_import", () => {
  // savePdfDocument → createImportJob → writeDraftsFromExtracted → acceptDraftPanel
  // expect getLabPanel source pdf_import, listDocumentsForEntity has doc
});

it("reject then discard does not create labs", () => { ... });

it("partial accept multi-panel leaves job ready until last pending resolved", () => { ... });

it("blocks document delete while job ready", () => { ... });
```

- [ ] **Step 6: Run tests and commit**

```bash
npm test -- tests/integration/imports.test.ts
git add src/lib/validation/import.ts src/lib/validation/lab.ts \
  src/server/services/imports.ts src/server/services/labs.ts \
  src/server/services/documents.ts tests/integration/imports.test.ts
git commit -m "feat: import job service with draft accept/reject into labs"
```

---

### Task 4: PDF text extraction

**Files:**
- Create: `src/lib/pdf-text.ts`
- Create: `tests/unit/pdf-text.test.ts`
- Modify: `package.json` (dependency)

- [ ] **Step 1: Install dependency**

```bash
npm install pdf-parse
npm install -D @types/pdf-parse
```

If `@types/pdf-parse` missing/unmaintained, add a minimal `src/types/pdf-parse.d.ts`.

- [ ] **Step 2: Implement extract helper**

`src/lib/pdf-text.ts`:

```ts
import pdf from "pdf-parse";

export const MIN_PDF_TEXT_CHARS = 40;
export const MAX_PDF_TEXT_CHARS = 200_000;

export class PdfTextError extends Error {
  constructor(
    message: string,
    public code: "EMPTY" | "TOO_SHORT" | "TOO_LONG" | "PARSE_FAILED",
  ) {
    super(message);
    this.name = "PdfTextError";
  }
}

export async function extractPdfText(buffer: Buffer): Promise<string> {
  let data: { text?: string };
  try {
    data = await pdf(buffer);
  } catch {
    throw new PdfTextError("Could not parse PDF", "PARSE_FAILED");
  }
  const text = (data.text ?? "").replace(/\u0000/g, "").trim();
  const nonWs = text.replace(/\s+/g, " ").trim();
  if (!nonWs) {
    throw new PdfTextError(
      "No text layer found. This looks like a scanned image PDF — Phase 2 requires selectable text (OCR not available).",
      "EMPTY",
    );
  }
  if (nonWs.length < MIN_PDF_TEXT_CHARS) {
    throw new PdfTextError(
      "PDF text layer is too short to extract labs. This may be a scan or mostly images.",
      "TOO_SHORT",
    );
  }
  if (nonWs.length > MAX_PDF_TEXT_CHARS) {
    throw new PdfTextError(
      `PDF text exceeds ${MAX_PDF_TEXT_CHARS} characters. Split the PDF or enter labs manually.`,
      "TOO_LONG",
    );
  }
  return text;
}

export function countExtractedChars(text: string): number {
  return text.length;
}
```

- [ ] **Step 3: Unit tests**

Test `TOO_SHORT` path with a tiny synthetic check by exporting a pure `assertTextUsable(text: string)` if pdf-parse is hard to unit-test without a real PDF. Prefer:

```ts
export function assertTextUsable(text: string): string {
  // same thresholds as above, used by extractPdfText after parse
}
```

Unit test `assertTextUsable` for empty, short, long, ok.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/lib/pdf-text.ts tests/unit/pdf-text.test.ts
git commit -m "feat: PDF text-layer extract with scan/size guards"
```

---

### Task 5: AI providers + lab extract (mockable)

**Files:**
- Create: `src/lib/ai/flags.ts`, `tests/unit/flags.test.ts`
- Create: `src/server/ai/types.ts`, `grok.ts`, `ollama.ts`, `router.ts`, `extract-labs.ts`
- Create: `tests/unit/extract-schema.test.ts`
- Modify: `package.json` (`openai`)

- [ ] **Step 1: Install openai**

```bash
npm install openai
```

- [ ] **Step 2: Flag normalizer**

`src/lib/ai/flags.ts`:

```ts
const MAP: Record<string, "normal" | "H" | "L" | "critical" | "unknown"> = {
  normal: "normal",
  n: "normal",
  h: "H",
  high: "H",
  "above high": "H",
  l: "L",
  low: "L",
  "below low": "L",
  critical: "critical",
  crit: "critical",
  unknown: "unknown",
  "": "unknown",
};

export function normalizeLabFlag(raw: unknown): "normal" | "H" | "L" | "critical" | "unknown" | null {
  if (raw == null || raw === "") return null;
  const key = String(raw).trim().toLowerCase();
  return MAP[key] ?? "unknown";
}
```

Unit test a few mappings.

- [ ] **Step 3: Provider interface + implementations**

`src/server/ai/types.ts`:

```ts
export type AIProviderId = "grok" | "ollama";

export interface AIProvider {
  readonly id: AIProviderId;
  completeJson(input: {
    system: string;
    user: string;
    model: string;
  }): Promise<unknown>;
}
```

`grok.ts`: use `OpenAI` with `baseURL: "https://api.x.ai/v1"`, `apiKey: process.env.XAI_API_KEY`. Call chat completions with `response_format: { type: "json_object" }` if supported; parse `message.content` as JSON.

`ollama.ts`: `POST ${baseUrl}/api/chat` with `{ model, stream: false, format: "json", messages: [...] }`; parse `message.content`.

`router.ts`:

```ts
export function getAIProvider(id: "grok" | "ollama", ollamaBaseUrl: string): AIProvider
```

Throw clear errors if Grok key missing when selected.

- [ ] **Step 4: `extract-labs.ts`**

```ts
export async function extractLabsFromText(opts: {
  text: string;
  provider: AIProvider;
  model: string;
}): Promise<ExtractedLabs>
```

- System prompt: extract lab panels/results only; do not invent; JSON schema description.  
- User: PDF text.  
- Parse with `extractedLabsSchema`; on failure, one repair call including validation error text; then throw.  
- Map each result flag through `normalizeLabFlag`.

Export a test helper path: accept optional `provider` injection (already in opts).

- [ ] **Step 5: Unit test schema + mock provider**

```ts
class FakeProvider implements AIProvider {
  id = "ollama" as const;
  constructor(private payload: unknown) {}
  async completeJson() { return this.payload; }
}

it("parses valid extract payload", async () => {
  const labs = await extractLabsFromText({
    text: "Glucose 112",
    provider: new FakeProvider({
      panels: [{ name: "CMP", results: [{ analyteName: "Glucose", value: "112", flag: "H" }] }],
    }),
    model: "fake",
  });
  expect(labs.panels[0].results[0].flag).toBe("H");
});
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/ai src/server/ai tests/unit
git commit -m "feat: dual AI provider router and lab PDF extract"
```

---

### Task 6: Import pipeline — start, confirm, run extract

**Files:**
- Modify: `src/server/services/imports.ts` (pipeline functions)
- Create: `src/server/actions/imports.ts`
- Create: `src/app/api/import/upload/route.ts`
- Extend: `tests/integration/imports.test.ts`

- [ ] **Step 1: Pipeline functions in imports service**

```ts
/** After document saved: create job and begin text phase */
export async function startImportFromPdf(opts: {
  originalFilename: string;
  buffer: Buffer;
  provider: "grok" | "ollama";
  model?: string;
}): Promise<{ jobId: string }>

export async function confirmCloudAndExtract(jobId: string): Promise<void>
export async function runExtractForJob(jobId: string): Promise<void>
export async function retryFailedJob(jobId: string): Promise<void>
```

**startImportFromPdf logic:**

1. Resolve model from opts or `getAiSettings()`.  
2. `savePdfDocument({ ..., uploadedVia: "ai_import" })`.  
3. `createImportJob`.  
4. `extractPdfText(buffer)` — on `PdfTextError`, set job `failed` + message, return jobId.  
5. Set `extractedCharCount`.  
6. If provider `grok` → status `awaiting_cloud_confirm`.  
7. If `ollama` → `runExtractForJob`.

**runExtractForJob:**

1. Status `extracting`.  
2. Re-read PDF bytes from disk via `getDocumentFilePath`.  
3. Extract text again (or optionally store text path — **re-extract from file** is fine for Phase 2).  
4. `getAIProvider` + `extractLabsFromText`.  
5. `writeDraftsFromExtracted`; status `ready`.  
6. On error → `failed` with message.

**confirmCloudAndExtract:** only if status `awaiting_cloud_confirm` and provider grok; set `cloudConfirmedAt`; then `runExtractForJob`.

- [ ] **Step 2: Upload API route**

`src/app/api/import/upload/route.ts`:

- `assertAuthenticated`  
- form: `file`, `provider`, optional `model`  
- call `startImportFromPdf`  
- return `{ ok, jobId }`  

- [ ] **Step 3: Server actions**

```ts
confirmCloudImportAction(jobId)
retryImportAction(jobId)
acceptDraftPanelAction(draftPanelId)
rejectDraftPanelAction(draftPanelId)
acceptAllPendingAction(jobId)
discardImportJobAction(jobId)
updateDraftPanelAction(draftPanelId, formData)
saveAiSettingsAction(formData) // can live in settings actions
```

Revalidate `/import`, `/import/[id]`, `/labs`, `/documents` as needed.

- [ ] **Step 4: Integration test with FakeProvider injection**

Prefer exporting `setExtractLabsForTests(fn)` or pass provider into `runExtractForJob` via optional override for tests:

```ts
export async function runExtractForJob(jobId: string, deps?: {
  extract?: typeof extractLabsFromText;
})
```

Test: start with buffer of a minimal PDF **or** skip upload and call `writeDraftsFromExtracted` after manually setting status (pipeline text tests can use a tiny real PDF fixture under `tests/fixtures/sample-lab.txt` path by mocking extractPdfText).

Pragmatic approach for CI:

- Unit/integration already cover drafts accept.  
- For pipeline: mock `extractPdfText` and `extractLabsFromText` via deps param on `startImportFromPdf` / `runExtractForJob`.

- [ ] **Step 5: Commit**

```bash
git add src/server/services/imports.ts src/server/actions/imports.ts \
  src/app/api/import/upload/route.ts tests/integration/imports.test.ts
git commit -m "feat: import pipeline start, cloud confirm, and extract run"
```

---

### Task 7: Import UI

**Files:**
- Modify: `src/components/layout/sidebar-nav.tsx`
- Create: `src/app/(app)/import/page.tsx`
- Create: `src/app/(app)/import/new/page.tsx`
- Create: `src/app/(app)/import/[id]/page.tsx`
- Create: `src/components/import/cloud-confirm.tsx`
- Create: `src/components/import/draft-panel-card.tsx`

- [ ] **Step 1: Sidebar**

Add `{ href: "/import", label: "Import" }` before Documents.

- [ ] **Step 2: List page `/import`**

Server component: `listImportJobs()`, table of filename, status, provider, created date, link to detail. Button “New import” → `/import/new`. Empty state copy.

- [ ] **Step 3: New page `/import/new`**

Client form:

- file input accept `application/pdf`  
- provider select default from settings (pass defaults as props from server wrapper)  
- optional model input  
- on submit: `fetch("/api/import/upload", formData)` → redirect to `/import/${jobId}`  

Match existing zinc/Tailwind styles from labs pages.

- [ ] **Step 4: Detail `/import/[id]`**

Server load `getImportJob`.

Render by status:

| Status | UI |
|--------|-----|
| `awaiting_cloud_confirm` | `CloudConfirm` client component (char count, filename, Send / Discard) |
| `extracting` / `pending` | Spinner + auto-refresh (`router.refresh` interval 2s) or meta refresh |
| `failed` | Error message + Retry if recoverable |
| `ready` / `completed` / `discarded` | Draft panel cards |
| `completed` | Summary + links to accepted labs |

Each pending draft: `DraftPanelCard` with editable fields (reuse patterns from lab form / `LabResultsEditor` if practical), Accept / Reject.

Job actions: Accept all pending, Discard job, Open PDF (`/api/documents/[id]/file`).

Disclaimer footer: “Assistive only — not medical advice.”

- [ ] **Step 5: Manual smoke (optional)**

```bash
npm run dev
# open /import/new
```

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/sidebar-nav.tsx src/app/\(app\)/import \
  src/components/import
git commit -m "feat: Import UI for AI lab PDF review workflow"
```

---

### Task 8: Settings AI UI + env/README polish

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`
- Create: `src/server/actions/settings.ts` (if not already)
- Modify: `.env.example`, `README.md`

- [ ] **Step 1: Replace AI stub on settings page**

Form fields:

- Default provider (select grok/ollama)  
- Grok model  
- Ollama base URL  
- Ollama model  
- Read-only: `XAI_API_KEY` configured: yes/no via `hasXaiApiKey()`  
- Note: cloud extract requires per-import confirm  

`saveAiSettingsAction` + revalidate settings.

- [ ] **Step 2: `.env.example`**

```env
# xAI / SpaceXAI key for Grok extract (server-side only)
XAI_API_KEY=
```

- [ ] **Step 3: README**

Update Phase 1 “Out of scope” — Phase 2 is available:

- Document Import flow  
- Dual providers  
- Text-layer requirement  
- Cloud confirm  
- `XAI_API_KEY`  

- [ ] **Step 4: Commit**

```bash
git add src/app/\(app\)/settings/page.tsx src/server/actions/settings.ts .env.example README.md
git commit -m "feat: Settings AI provider config and Phase 2 docs"
```

---

### Task 9: Final verification

- [ ] **Step 1: Full test suite**

```bash
npm test
npm run lint
npm run build
```

Expected: all pass; build succeeds.

- [ ] **Step 2: Fix any failures**

- [ ] **Step 3: Final commit if fixes needed**

```bash
git add -A
git commit -m "fix: Phase 2 verification cleanups"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|------------------|------|
| Labs-only extract | 5 |
| Dual Grok + Ollama | 5, 2, 8 |
| Dedicated Import page | 7 |
| Text layer only / scan fail | 4, 6 |
| Multi-panel drafts | 3, 5 |
| Persisted jobs/drafts | 1, 3 |
| Per-import cloud confirm | 6, 7 |
| Accept → pdf_import + document link | 3 |
| Reject/discard no clinical rows | 3 |
| Block doc delete while open job | 3 |
| Settings AI config | 2, 8 |
| Tests without live network | 3, 5, 6 |
| 200k char cap | 4 |
| Disclaimer not medical advice | 7 |

---

## Placeholder / consistency self-check

- Status enums aligned: `pending | awaiting_cloud_confirm | extracting | ready | failed | discarded | completed`  
- Provider ids: `grok | ollama` everywhere  
- Default Grok model: `grok-4.5`  
- No OCR, non-lab extract, or chat in this plan  
- `createLabPanel` gains optional `source` for import accept  
- AI calls only server-side  

---

## Execution handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-22-wfm-health-tracker-phase2.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with executing-plans checkpoints  

Which approach?
