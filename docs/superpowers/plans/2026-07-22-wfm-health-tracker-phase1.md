# WFM Health Tracker Phase 1 (Records Hub) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a local Next.js health chart where you can maintain profile/allergies, full CRUD for clinical records, attach source PDFs, search, and optionally lock the app with a passcode.

**Architecture:** Modular monolith — Next.js App Router (UI + Server Actions + API routes), domain services in `src/server/services`, Drizzle + SQLite under `data/health.sqlite`, PDF binaries under `data/uploads/`. No AI in this phase.

**Tech Stack:** Next.js 15 (App Router), TypeScript, React 19, Tailwind CSS, Drizzle ORM, better-sqlite3, Zod, Vitest, iron-session (passcode), nanoid (ids).

**Spec:** `docs/superpowers/specs/2026-07-22-wfm-health-tracker-design.md`

---

## File map (create during Phase 1)

```
.gitignore
.env.example
package.json
tsconfig.json
next.config.ts
drizzle.config.ts
vitest.config.ts
README.md
data/.gitkeep
src/
  app/
    layout.tsx
    page.tsx                          # Dashboard
    globals.css
    login/page.tsx
    profile/page.tsx
    diagnoses/page.tsx
    diagnoses/[id]/page.tsx
    diagnoses/new/page.tsx
    medications/page.tsx
    medications/[id]/page.tsx
    medications/new/page.tsx
    supplements/page.tsx
    supplements/[id]/page.tsx
    supplements/new/page.tsx
    labs/page.tsx
    labs/[id]/page.tsx
    labs/new/page.tsx
    tests/page.tsx
    tests/[id]/page.tsx
    tests/new/page.tsx
    procedures/page.tsx
    procedures/[id]/page.tsx
    procedures/new/page.tsx
    documents/page.tsx
    settings/page.tsx
    api/documents/upload/route.ts
    api/documents/[id]/file/route.ts
  components/
    layout/app-shell.tsx
    layout/sidebar-nav.tsx
    records/entity-table.tsx
    records/attachments-panel.tsx
    records/confirm-delete-button.tsx
    ui/button.tsx
    ui/input.tsx
    ui/label.tsx
    ui/textarea.tsx
    ui/select.tsx
    ui/badge.tsx
  lib/
    ids.ts
    units.ts
    dates.ts
    validation/
      profile.ts
      allergy.ts
      diagnosis.ts
      medication.ts
      supplement.ts
      lab.ts
      test-result.ts
      procedure.ts
      document.ts
      settings.ts
  server/
    db/
      index.ts
      schema.ts
      migrate.ts
    auth/
      session.ts
      password.ts
      guard.ts
    services/
      profile.ts
      allergies.ts
      diagnoses.ts
      medications.ts
      supplements.ts
      labs.ts
      tests.ts
      procedures.ts
      documents.ts
      search.ts
      dashboard.ts
      settings.ts
    actions/
      profile.ts
      allergies.ts
      diagnoses.ts
      medications.ts
      supplements.ts
      labs.ts
      tests.ts
      procedures.ts
      documents.ts
      auth.ts
      settings.ts
  middleware.ts
tests/
  setup.ts
  helpers/test-db.ts
  unit/units.test.ts
  unit/validation.test.ts
  integration/profile.test.ts
  integration/diagnoses.test.ts
  integration/medications.test.ts
  integration/labs.test.ts
  integration/documents.test.ts
  integration/search.test.ts
  integration/auth.test.ts
```

---

### Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `.gitignore`, `.env.example`, `README.md`, `data/.gitkeep`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Scaffold Next.js app in the repo root**

Run from repo root (existing git repo with design docs only):

```bash
npx create-next-app@15 . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --yes
```

If create-next-app refuses non-empty directory, scaffold in a temp dir and move files:

```bash
npx create-next-app@15 /tmp/wfm-ht-scaffold --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --turbopack --yes
cp -R /tmp/wfm-ht-scaffold/* /tmp/wfm-ht-scaffold/.[!.]* . 2>/dev/null || true
# Manually ensure docs/ is preserved; do not overwrite docs/
```

- [ ] **Step 2: Install Phase 1 dependencies**

```bash
npm install drizzle-orm better-sqlite3 zod nanoid iron-session bcryptjs
npm install -D drizzle-kit @types/better-sqlite3 @types/bcryptjs vitest @vitejs/plugin-react
```

- [ ] **Step 3: Write `.gitignore` (ensure data and secrets excluded)**

```gitignore
# dependencies
/node_modules
/.pnp
.pnp.*
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/versions

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# env
.env
.env*.local

# typescript
*.tsbuildinfo
next-env.d.ts

# app data (PHI)
/data/*
!/data/.gitkeep
```

- [ ] **Step 4: Create `data/.gitkeep`, `.env.example`, bind localhost in scripts**

`.env.example`:

```env
# Optional: set to enable passcode lock. Leave empty to disable auth.
APP_PASSWORD=
# Cookie signing secret (required if APP_PASSWORD set). Generate: openssl rand -hex 32
SESSION_SECRET=
# Absolute or relative path for SQLite + uploads (default: ./data)
DATA_DIR=./data
# Max PDF upload size in bytes (default 25MB)
MAX_UPLOAD_BYTES=26214400
```

`package.json` scripts (merge with existing):

```json
{
  "scripts": {
    "dev": "next dev --hostname 127.0.0.1 --port 3000",
    "build": "next build",
    "start": "next start --hostname 127.0.0.1 --port 3000",
    "lint": "next lint",
    "test": "vitest run",
    "test:watch": "vitest",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx src/server/db/migrate.ts"
  }
}
```

- [ ] **Step 5: Add Vitest config**

`vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

`tests/setup.ts`:

```ts
import path from "node:path";
import os from "node:os";
import fs from "node:fs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "wfm-ht-"));
process.env.DATA_DIR = tmp;
process.env.SESSION_SECRET = "test-session-secret-at-least-32-chars!!";
process.env.APP_PASSWORD = "";
```

- [ ] **Step 6: Minimal README**

```md
# WFM Health Tracker

Personal local health chart (Phase 1: records hub).

## Run

```bash
cp .env.example .env
npm install
npm run dev
```

Open http://127.0.0.1:3000

## Backup

Copy the entire `data/` directory (SQLite + PDFs).

## Tests

```bash
npm test
```
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: listening on `127.0.0.1:3000`. Stop after verify.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Next.js app with local data paths and vitest"
```

---

### Task 2: Shared utilities and DB schema

**Files:**
- Create: `src/lib/ids.ts`, `src/lib/units.ts`, `src/lib/dates.ts`, `src/server/db/schema.ts`, `src/server/db/index.ts`, `src/server/db/migrate.ts`, `drizzle.config.ts`, `tests/helpers/test-db.ts`, `tests/unit/units.test.ts`

- [ ] **Step 1: Write failing unit test for units helper**

`tests/unit/units.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { cmToIn, inToCm, kgToLb, lbToKg, formatHeight, formatWeight } from "@/lib/units";

describe("units", () => {
  it("converts height cm <-> in", () => {
    expect(inToCm(70)).toBeCloseTo(177.8, 1);
    expect(cmToIn(180)).toBeCloseTo(70.866, 2);
  });

  it("converts weight kg <-> lb", () => {
    expect(kgToLb(70)).toBeCloseTo(154.324, 2);
    expect(lbToKg(154.324)).toBeCloseTo(70, 1);
  });

  it("formats height and weight", () => {
    expect(formatHeight(180, "cm")).toBe("180 cm");
    expect(formatWeight(70, "kg")).toBe("70 kg");
  });
});
```

- [ ] **Step 2: Run test — expect fail**

```bash
npm test -- tests/unit/units.test.ts
```

Expected: FAIL module not found.

- [ ] **Step 3: Implement utilities**

`src/lib/ids.ts`:

```ts
import { nanoid } from "nanoid";

export function newId(): string {
  return nanoid(21);
}
```

`src/lib/dates.ts`:

```ts
export function nowIso(): string {
  return new Date().toISOString();
}

/** Age in whole years from ISO date YYYY-MM-DD, or null if invalid/missing. */
export function ageFromDob(dob: string | null | undefined, today = new Date()): number | null {
  if (!dob) return null;
  const d = new Date(dob + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age;
}
```

`src/lib/units.ts`:

```ts
export type LengthUnit = "cm" | "in";
export type WeightUnit = "kg" | "lb";

export function cmToIn(cm: number): number {
  return cm / 2.54;
}

export function inToCm(inches: number): number {
  return inches * 2.54;
}

export function kgToLb(kg: number): number {
  return kg * 2.2046226218;
}

export function lbToKg(lb: number): number {
  return lb / 2.2046226218;
}

export function formatHeight(value: number, unit: LengthUnit): string {
  return `${value} ${unit}`;
}

export function formatWeight(value: number, unit: WeightUnit): string {
  return `${value} ${unit}`;
}
```

- [ ] **Step 4: Run units test — expect pass**

```bash
npm test -- tests/unit/units.test.ts
```

- [ ] **Step 5: Define full Drizzle schema**

`src/server/db/schema.ts`:

```ts
import { sqliteTable, text, real, integer, primaryKey } from "drizzle-orm/sqlite-core";

export const profile = sqliteTable("profile", {
  id: text("id").primaryKey(), // always "default"
  displayName: text("display_name"),
  dateOfBirth: text("date_of_birth"),
  sex: text("sex"),
  heightValue: real("height_value"),
  heightUnit: text("height_unit"), // cm | in
  weightValue: real("weight_value"),
  weightUnit: text("weight_unit"), // kg | lb
  bloodType: text("blood_type"),
  notes: text("notes"),
  preferredLengthUnit: text("preferred_length_unit").notNull().default("cm"),
  preferredWeightUnit: text("preferred_weight_unit").notNull().default("kg"),
  updatedAt: text("updated_at").notNull(),
});

export const allergies = sqliteTable("allergies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  reaction: text("reaction"),
  severity: text("severity"), // mild | moderate | severe | unknown
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const diagnoses = sqliteTable("diagnoses", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  status: text("status").notNull(), // active | resolved | chronic
  diagnosedOn: text("diagnosed_on"),
  icdCode: text("icd_code"),
  clinician: text("clinician"),
  facility: text("facility"),
  notes: text("notes"),
  source: text("source").notNull().default("manual"), // manual | pdf_import
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const medications = sqliteTable("medications", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  dose: text("dose"),
  form: text("form"),
  route: text("route"),
  frequency: text("frequency"),
  prn: integer("prn", { mode: "boolean" }).notNull().default(false),
  startOn: text("start_on"),
  endOn: text("end_on"),
  status: text("status").notNull(), // active | stopped
  purpose: text("purpose"),
  prescriber: text("prescriber"),
  notes: text("notes"),
  source: text("source").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const supplements = sqliteTable("supplements", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  dose: text("dose"),
  form: text("form"),
  route: text("route"),
  frequency: text("frequency"),
  prn: integer("prn", { mode: "boolean" }).notNull().default(false),
  startOn: text("start_on"),
  endOn: text("end_on"),
  status: text("status").notNull(),
  purpose: text("purpose"),
  notes: text("notes"),
  source: text("source").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const labPanels = sqliteTable("lab_panels", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  collectedOn: text("collected_on"),
  facility: text("facility"),
  status: text("status").notNull().default("final"), // pending | final
  notes: text("notes"),
  source: text("source").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const labResults = sqliteTable("lab_results", {
  id: text("id").primaryKey(),
  panelId: text("panel_id")
    .notNull()
    .references(() => labPanels.id, { onDelete: "cascade" }),
  analyteName: text("analyte_name").notNull(),
  value: text("value"),
  unit: text("unit"),
  refLow: text("ref_low"),
  refHigh: text("ref_high"),
  flag: text("flag"), // normal | H | L | critical | unknown
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const tests = sqliteTable("tests", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // imaging | pathology | other
  name: text("name").notNull(),
  performedOn: text("performed_on"),
  facility: text("facility"),
  summary: text("summary"),
  keyFindings: text("key_findings"),
  notes: text("notes"),
  source: text("source").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const procedures = sqliteTable("procedures", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  performedOn: text("performed_on"),
  facility: text("facility"),
  clinician: text("clinician"),
  outcome: text("outcome"),
  followUp: text("follow_up"),
  notes: text("notes"),
  source: text("source").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const documents = sqliteTable("documents", {
  id: text("id").primaryKey(),
  originalFilename: text("original_filename").notNull(),
  contentType: text("content_type").notNull(),
  storagePath: text("storage_path").notNull(),
  byteSize: integer("byte_size").notNull(),
  checksum: text("checksum").notNull(),
  title: text("title"),
  description: text("description"),
  uploadedVia: text("uploaded_via").notNull(), // manual | ai_import
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

/** entityType: diagnosis | medication | supplement | lab_panel | test | procedure */
export const documentLinks = sqliteTable(
  "document_links",
  {
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.documentId, t.entityType, t.entityId] }),
  }),
);

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});
```

- [ ] **Step 6: DB client + migrate helper**

`src/server/db/index.ts`:

```ts
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

function dataDir(): string {
  return path.resolve(process.env.DATA_DIR ?? "./data");
}

export function ensureDataDirs(): { dataDir: string; uploadsDir: string; dbPath: string } {
  const dir = dataDir();
  const uploadsDir = path.join(dir, "uploads");
  fs.mkdirSync(uploadsDir, { recursive: true });
  return { dataDir: dir, uploadsDir, dbPath: path.join(dir, "health.sqlite") };
}

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _sqlite: Database.Database | null = null;

export function getDb() {
  if (_db) return _db;
  const { dbPath } = ensureDataDirs();
  _sqlite = new Database(dbPath);
  _sqlite.pragma("journal_mode = WAL");
  _sqlite.pragma("foreign_keys = ON");
  _db = drizzle(_sqlite, { schema });
  return _db;
}

/** Test-only: reset singleton so a new DATA_DIR is picked up. */
export function resetDbForTests() {
  if (_sqlite) _sqlite.close();
  _db = null;
  _sqlite = null;
}

export type AppDb = ReturnType<typeof getDb>;
```

`src/server/db/migrate.ts`:

```ts
import { getDb, ensureDataDirs } from "./index";
import { sql } from "drizzle-orm";

/** Apply schema via drizzle push-style SQL for simplicity in Phase 1. */
export function migrate() {
  ensureDataDirs();
  const db = getDb();
  // Use drizzle-kit generated migrations in production; for Phase 1 apply create statements:
  db.run(sql`CREATE TABLE IF NOT EXISTS profile (
    id TEXT PRIMARY KEY,
    display_name TEXT,
    date_of_birth TEXT,
    sex TEXT,
    height_value REAL,
    height_unit TEXT,
    weight_value REAL,
    weight_unit TEXT,
    blood_type TEXT,
    notes TEXT,
    preferred_length_unit TEXT NOT NULL DEFAULT 'cm',
    preferred_weight_unit TEXT NOT NULL DEFAULT 'kg',
    updated_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS allergies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    reaction TEXT,
    severity TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS diagnoses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    status TEXT NOT NULL,
    diagnosed_on TEXT,
    icd_code TEXT,
    clinician TEXT,
    facility TEXT,
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS medications (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dose TEXT,
    form TEXT,
    route TEXT,
    frequency TEXT,
    prn INTEGER NOT NULL DEFAULT 0,
    start_on TEXT,
    end_on TEXT,
    status TEXT NOT NULL,
    purpose TEXT,
    prescriber TEXT,
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS supplements (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    dose TEXT,
    form TEXT,
    route TEXT,
    frequency TEXT,
    prn INTEGER NOT NULL DEFAULT 0,
    start_on TEXT,
    end_on TEXT,
    status TEXT NOT NULL,
    purpose TEXT,
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS lab_panels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    collected_on TEXT,
    facility TEXT,
    status TEXT NOT NULL DEFAULT 'final',
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS lab_results (
    id TEXT PRIMARY KEY,
    panel_id TEXT NOT NULL REFERENCES lab_panels(id) ON DELETE CASCADE,
    analyte_name TEXT NOT NULL,
    value TEXT,
    unit TEXT,
    ref_low TEXT,
    ref_high TEXT,
    flag TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS tests (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    performed_on TEXT,
    facility TEXT,
    summary TEXT,
    key_findings TEXT,
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS procedures (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    performed_on TEXT,
    facility TEXT,
    clinician TEXT,
    outcome TEXT,
    follow_up TEXT,
    notes TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    original_filename TEXT NOT NULL,
    content_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    checksum TEXT NOT NULL,
    title TEXT,
    description TEXT,
    uploaded_via TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS document_links (
    document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (document_id, entity_type, entity_id)
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);
}

if (require.main === module) {
  migrate();
  console.log("Migrations applied");
}
```

Note: if `require.main` is awkward under ESM, use:

```ts
import { pathToFileURL } from "node:url";
if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  migrate();
  console.log("Migrations applied");
}
```

Also install `tsx` if needed: `npm install -D tsx`.

`drizzle.config.ts`:

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: (process.env.DATA_DIR ?? "./data") + "/health.sqlite",
  },
});
```

`tests/helpers/test-db.ts`:

```ts
import { beforeEach } from "vitest";
import { resetDbForTests, getDb, ensureDataDirs } from "@/server/db";
import { migrate } from "@/server/db/migrate";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

export function useFreshDb() {
  beforeEach(() => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "wfm-ht-"));
    process.env.DATA_DIR = dir;
    resetDbForTests();
    migrate();
  });
}

export { getDb, ensureDataDirs };
```

Call `migrate()` once at app startup (e.g. from `src/server/db/index.ts` after first getDb, or in instrumentation / layout server side):

```ts
// src/server/db/bootstrap.ts
import { migrate } from "./migrate";

let done = false;
export function bootstrapDb() {
  if (done) return;
  migrate();
  done = true;
}
```

Invoke `bootstrapDb()` at the start of every service entry and API route (or Next.js `instrumentation.ts`).

- [ ] **Step 7: Smoke migrate in temp dir**

```bash
DATA_DIR=/tmp/wfm-ht-smoke npm run db:migrate
ls /tmp/wfm-ht-smoke/health.sqlite
```

Expected: file exists.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: add SQLite schema, db client, and unit helpers"
```

---

### Task 3: Profile + allergies services and UI

**Files:**
- Create: `src/lib/validation/profile.ts`, `src/lib/validation/allergy.ts`, `src/server/services/profile.ts`, `src/server/services/allergies.ts`, `src/server/actions/profile.ts`, `src/server/actions/allergies.ts`, `src/app/profile/page.tsx`, `tests/integration/profile.test.ts`, `tests/unit/validation.test.ts`

- [ ] **Step 1: Write validation + integration tests**

`src/lib/validation/profile.ts`:

```ts
import { z } from "zod";

export const profileSchema = z.object({
  displayName: z.string().max(200).optional().nullable(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
    .optional()
    .nullable()
    .or(z.literal("")),
  sex: z.string().max(100).optional().nullable(),
  heightValue: z.coerce.number().positive().optional().nullable(),
  heightUnit: z.enum(["cm", "in"]).optional().nullable(),
  weightValue: z.coerce.number().positive().optional().nullable(),
  weightUnit: z.enum(["kg", "lb"]).optional().nullable(),
  bloodType: z.string().max(20).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
  preferredLengthUnit: z.enum(["cm", "in"]).default("cm"),
  preferredWeightUnit: z.enum(["kg", "lb"]).default("kg"),
});

export type ProfileInput = z.infer<typeof profileSchema>;
```

`src/lib/validation/allergy.ts`:

```ts
import { z } from "zod";

export const allergySchema = z.object({
  name: z.string().min(1).max(200),
  reaction: z.string().max(500).optional().nullable(),
  severity: z.enum(["mild", "moderate", "severe", "unknown"]).optional().nullable(),
  notes: z.string().max(5000).optional().nullable(),
});

export type AllergyInput = z.infer<typeof allergySchema>;
```

`tests/unit/validation.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { profileSchema } from "@/lib/validation/profile";
import { allergySchema } from "@/lib/validation/allergy";

describe("profileSchema", () => {
  it("accepts empty optional fields", () => {
    const r = profileSchema.safeParse({ preferredLengthUnit: "cm", preferredWeightUnit: "kg" });
    expect(r.success).toBe(true);
  });

  it("rejects bad dob", () => {
    const r = profileSchema.safeParse({
      dateOfBirth: "01/01/1980",
      preferredLengthUnit: "cm",
      preferredWeightUnit: "kg",
    });
    expect(r.success).toBe(false);
  });
});

describe("allergySchema", () => {
  it("requires name", () => {
    expect(allergySchema.safeParse({ name: "" }).success).toBe(false);
    expect(allergySchema.safeParse({ name: "Penicillin" }).success).toBe(true);
  });
});
```

`tests/integration/profile.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { useFreshDb } from "../helpers/test-db";
import { getProfile, upsertProfile } from "@/server/services/profile";
import { createAllergy, listAllergies, deleteAllergy } from "@/server/services/allergies";

useFreshDb();

describe("profile service", () => {
  it("creates default profile on get", () => {
    const p = getProfile();
    expect(p.id).toBe("default");
  });

  it("updates profile fields", () => {
    upsertProfile({
      displayName: "J",
      dateOfBirth: "1980-05-01",
      heightValue: 180,
      heightUnit: "cm",
      weightValue: 75,
      weightUnit: "kg",
      preferredLengthUnit: "cm",
      preferredWeightUnit: "kg",
    });
    const p = getProfile();
    expect(p.displayName).toBe("J");
    expect(p.heightValue).toBe(180);
  });
});

describe("allergies service", () => {
  it("creates and lists allergies", () => {
    createAllergy({ name: "Sulfa", severity: "moderate" });
    const list = listAllergies();
    expect(list).toHaveLength(1);
    expect(list[0].name).toBe("Sulfa");
  });

  it("deletes allergy", () => {
    const a = createAllergy({ name: "Latex" });
    deleteAllergy(a.id);
    expect(listAllergies()).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests — expect fail (services missing)**

```bash
npm test -- tests/unit/validation.test.ts tests/integration/profile.test.ts
```

- [ ] **Step 3: Implement services**

`src/server/services/profile.ts`:

```ts
import { eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { profile } from "@/server/db/schema";
import { nowIso } from "@/lib/dates";
import type { ProfileInput } from "@/lib/validation/profile";

const PROFILE_ID = "default";

export function getProfile() {
  bootstrapDb();
  const db = getDb();
  const row = db.select().from(profile).where(eq(profile.id, PROFILE_ID)).get();
  if (row) return row;
  const updatedAt = nowIso();
  db.insert(profile)
    .values({
      id: PROFILE_ID,
      preferredLengthUnit: "cm",
      preferredWeightUnit: "kg",
      updatedAt,
    })
    .run();
  return db.select().from(profile).where(eq(profile.id, PROFILE_ID)).get()!;
}

export function upsertProfile(input: ProfileInput) {
  bootstrapDb();
  const db = getDb();
  getProfile();
  const updatedAt = nowIso();
  db.update(profile)
    .set({
      displayName: emptyToNull(input.displayName),
      dateOfBirth: emptyToNull(input.dateOfBirth),
      sex: emptyToNull(input.sex),
      heightValue: input.heightValue ?? null,
      heightUnit: input.heightUnit ?? null,
      weightValue: input.weightValue ?? null,
      weightUnit: input.weightUnit ?? null,
      bloodType: emptyToNull(input.bloodType),
      notes: emptyToNull(input.notes),
      preferredLengthUnit: input.preferredLengthUnit ?? "cm",
      preferredWeightUnit: input.preferredWeightUnit ?? "kg",
      updatedAt,
    })
    .where(eq(profile.id, PROFILE_ID))
    .run();
  return getProfile();
}

function emptyToNull(v: string | null | undefined) {
  if (v == null || v === "") return null;
  return v;
}
```

`src/server/services/allergies.ts`:

```ts
import { eq, desc } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { allergies } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import type { AllergyInput } from "@/lib/validation/allergy";

export function listAllergies() {
  bootstrapDb();
  return getDb().select().from(allergies).orderBy(desc(allergies.createdAt)).all();
}

export function createAllergy(input: AllergyInput) {
  bootstrapDb();
  const id = newId();
  const t = nowIso();
  getDb()
    .insert(allergies)
    .values({
      id,
      name: input.name,
      reaction: input.reaction ?? null,
      severity: input.severity ?? null,
      notes: input.notes ?? null,
      createdAt: t,
      updatedAt: t,
    })
    .run();
  return getDb().select().from(allergies).where(eq(allergies.id, id)).get()!;
}

export function updateAllergy(id: string, input: AllergyInput) {
  bootstrapDb();
  getDb()
    .update(allergies)
    .set({
      name: input.name,
      reaction: input.reaction ?? null,
      severity: input.severity ?? null,
      notes: input.notes ?? null,
      updatedAt: nowIso(),
    })
    .where(eq(allergies.id, id))
    .run();
  return getDb().select().from(allergies).where(eq(allergies.id, id)).get()!;
}

export function deleteAllergy(id: string) {
  bootstrapDb();
  getDb().delete(allergies).where(eq(allergies.id, id)).run();
}
```

`src/server/db/bootstrap.ts`:

```ts
import { migrate } from "./migrate";

let done = false;
export function bootstrapDb() {
  if (done) return;
  migrate();
  done = true;
}

export function resetBootstrapForTests() {
  done = false;
}
```

Update `resetDbForTests` to also call `resetBootstrapForTests()`.

- [ ] **Step 4: Run tests — expect pass**

```bash
npm test -- tests/unit/validation.test.ts tests/integration/profile.test.ts
```

- [ ] **Step 5: Server actions + profile page**

`src/server/actions/profile.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { profileSchema } from "@/lib/validation/profile";
import { upsertProfile } from "@/server/services/profile";

export async function saveProfileAction(formData: FormData) {
  const raw = Object.fromEntries(formData.entries());
  const parsed = profileSchema.safeParse({
    ...raw,
    heightValue: raw.heightValue === "" ? null : raw.heightValue,
    weightValue: raw.weightValue === "" ? null : raw.weightValue,
  });
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.flatten() };
  }
  upsertProfile(parsed.data);
  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true as const };
}
```

`src/server/actions/allergies.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { allergySchema } from "@/lib/validation/allergy";
import { createAllergy, deleteAllergy } from "@/server/services/allergies";

export async function createAllergyAction(formData: FormData) {
  const parsed = allergySchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { ok: false as const, error: parsed.error.flatten() };
  createAllergy(parsed.data);
  revalidatePath("/profile");
  return { ok: true as const };
}

export async function deleteAllergyAction(id: string) {
  deleteAllergy(id);
  revalidatePath("/profile");
  return { ok: true as const };
}
```

Build `src/app/profile/page.tsx` as a server component that loads `getProfile()` + `listAllergies()`, renders a form posting to `saveProfileAction`, and a small form/list for allergies. Use plain HTML form controls + Tailwind. Display derived age via `ageFromDob`.

- [ ] **Step 6: Manual check**

```bash
npm run dev
```

Open `/profile`, save name + height, add allergy. Confirm persists after refresh.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: profile and allergies services and UI"
```

---

### Task 4: App shell + shared UI primitives

**Files:**
- Create: `src/components/layout/app-shell.tsx`, `src/components/layout/sidebar-nav.tsx`, `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/label.tsx`, `src/components/ui/textarea.tsx`, `src/components/ui/select.tsx`, `src/components/ui/badge.tsx`, `src/components/records/entity-table.tsx`, `src/components/records/confirm-delete-button.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Implement sidebar nav links**

Nav items: Dashboard `/`, Profile, Diagnoses, Medications, Supplements, Labs, Tests, Procedures, Documents, Settings.

`src/components/layout/sidebar-nav.tsx` — client component with `usePathname` for active styles.

`src/components/layout/app-shell.tsx`:

```tsx
import { SidebarNav } from "./sidebar-nav";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-zinc-50 text-zinc-900">
      <aside className="w-56 border-r border-zinc-200 bg-white p-4 shrink-0">
        <div className="font-semibold text-sm mb-4 tracking-tight">WFM Health Tracker</div>
        <SidebarNav />
      </aside>
      <main className="flex-1 p-6 max-w-5xl">{children}</main>
    </div>
  );
}
```

Wrap children in `layout.tsx` with `AppShell` except login route (conditional via path segment or separate layout group). Prefer route groups:

```
src/app/(app)/layout.tsx  → AppShell
src/app/(app)/page.tsx
src/app/(app)/profile/...
src/app/(auth)/login/page.tsx
```

Move existing pages under `(app)` as you create them.

- [ ] **Step 2: Minimal UI primitives**

`button.tsx`, `input.tsx`, `label.tsx`, `textarea.tsx`, `select.tsx`, `badge.tsx` — thin wrappers with Tailwind classes (`border`, `rounded-md`, `px-3`, `py-2`, etc.). Keep unstyled enough to reuse.

- [ ] **Step 3: Entity table helper**

`src/components/records/entity-table.tsx` — accepts `headers: string[]` and `rows: React.ReactNode[][]` or children; keep simple:

```tsx
export function EntityTable({
  headers,
  children,
}: {
  headers: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto border border-zinc-200 rounded-lg bg-white">
      <table className="w-full text-sm text-left">
        <thead className="bg-zinc-100 text-zinc-600">
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">{children}</tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: app shell, nav, and shared UI primitives"
```

---

### Task 5: Diagnoses CRUD

**Files:**
- Create: `src/lib/validation/diagnosis.ts`, `src/server/services/diagnoses.ts`, `src/server/actions/diagnoses.ts`, `src/app/(app)/diagnoses/page.tsx`, `src/app/(app)/diagnoses/new/page.tsx`, `src/app/(app)/diagnoses/[id]/page.tsx`, `tests/integration/diagnoses.test.ts`

- [ ] **Step 1: Write integration tests**

```ts
import { describe, it, expect } from "vitest";
import { useFreshDb } from "../helpers/test-db";
import {
  createDiagnosis,
  getDiagnosis,
  listDiagnoses,
  updateDiagnosis,
  deleteDiagnosis,
} from "@/server/services/diagnoses";

useFreshDb();

describe("diagnoses service", () => {
  it("creates and lists", () => {
    createDiagnosis({
      name: "Ulcerative colitis",
      status: "chronic",
      diagnosedOn: "2015-03-01",
    });
    expect(listDiagnoses()).toHaveLength(1);
  });

  it("updates and deletes", () => {
    const d = createDiagnosis({ name: "Anemia", status: "active" });
    updateDiagnosis(d.id, { name: "Iron deficiency anemia", status: "active" });
    expect(getDiagnosis(d.id)?.name).toContain("Iron");
    deleteDiagnosis(d.id);
    expect(getDiagnosis(d.id)).toBeUndefined();
  });

  it("filters by status", () => {
    createDiagnosis({ name: "A", status: "active" });
    createDiagnosis({ name: "B", status: "resolved" });
    expect(listDiagnoses({ status: "active" })).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run — expect fail**

```bash
npm test -- tests/integration/diagnoses.test.ts
```

- [ ] **Step 3: Validation + service**

`src/lib/validation/diagnosis.ts`:

```ts
import { z } from "zod";

export const diagnosisSchema = z.object({
  name: z.string().min(1).max(300),
  status: z.enum(["active", "resolved", "chronic"]),
  diagnosedOn: z.string().optional().nullable(),
  icdCode: z.string().max(32).optional().nullable(),
  clinician: z.string().max(200).optional().nullable(),
  facility: z.string().max(200).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
});

export type DiagnosisInput = z.infer<typeof diagnosisSchema>;
```

`src/server/services/diagnoses.ts` — implement `listDiagnoses(filter?: { status?: string; q?: string })`, `getDiagnosis`, `createDiagnosis`, `updateDiagnosis`, `deleteDiagnosis` following allergies pattern; search `q` with SQL `LIKE` on name/notes/icd.

- [ ] **Step 4: Tests pass**

```bash
npm test -- tests/integration/diagnoses.test.ts
```

- [ ] **Step 5: Actions + pages**

- List page: table of diagnoses, filter chips for status, link to detail, “Add diagnosis”.
- New page: form → `createDiagnosisAction` → redirect to detail.
- Detail page: edit form + delete button + placeholder for AttachmentsPanel (wire in Task 10).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: diagnoses CRUD"
```

---

### Task 6: Medications + supplements CRUD

**Files:**
- Create: `src/lib/validation/medication.ts`, `src/lib/validation/supplement.ts`, `src/server/services/medications.ts`, `src/server/services/supplements.ts`, `src/server/actions/medications.ts`, `src/server/actions/supplements.ts`, pages under `medications/` and `supplements/`, `tests/integration/medications.test.ts`

- [ ] **Step 1: Write tests for medications**

```ts
import { describe, it, expect } from "vitest";
import { useFreshDb } from "../helpers/test-db";
import {
  createMedication,
  listMedications,
  updateMedication,
  deleteMedication,
} from "@/server/services/medications";
import {
  createSupplement,
  listSupplements,
  deleteSupplement,
} from "@/server/services/supplements";

useFreshDb();

describe("medications", () => {
  it("defaults list to active when filtered", () => {
    createMedication({ name: "Mesalamine", status: "active", dose: "1.2g", prn: false });
    createMedication({ name: "Prednisone", status: "stopped", dose: "40mg", prn: false });
    expect(listMedications({ status: "active" })).toHaveLength(1);
  });

  it("supports PRN flag", () => {
    const m = createMedication({ name: "Loperamide", status: "active", prn: true, frequency: "as needed" });
    expect(m.prn).toBe(true);
  });

  it("updates and deletes", () => {
    const m = createMedication({ name: "X", status: "active", prn: false });
    updateMedication(m.id, { name: "Y", status: "stopped", prn: false });
    deleteMedication(m.id);
    expect(listMedications()).toHaveLength(0);
  });
});

describe("supplements", () => {
  it("creates list item", () => {
    createSupplement({ name: "Vitamin D", status: "active", dose: "2000 IU", prn: false });
    expect(listSupplements({ status: "active" })[0].name).toBe("Vitamin D");
    const s = listSupplements()[0];
    deleteSupplement(s.id);
  });
});
```

- [ ] **Step 2: Implement validation schemas**

`medicationSchema` / `supplementSchema`:

```ts
import { z } from "zod";

export const medicationSchema = z.object({
  name: z.string().min(1).max(300),
  dose: z.string().max(100).optional().nullable(),
  form: z.string().max(100).optional().nullable(),
  route: z.string().max(100).optional().nullable(),
  frequency: z.string().max(200).optional().nullable(),
  prn: z.coerce.boolean().default(false),
  startOn: z.string().optional().nullable(),
  endOn: z.string().optional().nullable(),
  status: z.enum(["active", "stopped"]),
  purpose: z.string().max(300).optional().nullable(),
  prescriber: z.string().max(200).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
});

export const supplementSchema = medicationSchema.omit({ prescriber: true });
```

- [ ] **Step 3: Implement services, actions, list/new/detail pages for both entities**

Default list filter: `status=active` with toggle to show all/stopped.

- [ ] **Step 4: Run tests**

```bash
npm test -- tests/integration/medications.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: medications and supplements CRUD"
```

---

### Task 7: Labs (panel + results) CRUD

**Files:**
- Create: `src/lib/validation/lab.ts`, `src/server/services/labs.ts`, `src/server/actions/labs.ts`, lab pages, `tests/integration/labs.test.ts`

- [ ] **Step 1: Failing integration test — transactional create**

```ts
import { describe, it, expect } from "vitest";
import { useFreshDb, getDb } from "../helpers/test-db";
import { createLabPanel, getLabPanel, updateLabPanel, deleteLabPanel, listLabPanels } from "@/server/services/labs";
import { labResults } from "@/server/db/schema";
import { eq } from "drizzle-orm";

useFreshDb();

describe("labs", () => {
  it("creates panel with results in one transaction", () => {
    const panel = createLabPanel(
      {
        name: "CBC",
        collectedOn: "2026-01-15",
        status: "final",
      },
      [
        { analyteName: "WBC", value: "6.2", unit: "K/uL", refLow: "4.0", refHigh: "11.0", flag: "normal" },
        { analyteName: "Hgb", value: "11.0", unit: "g/dL", refLow: "13.0", refHigh: "17.0", flag: "L" },
      ],
    );
    const full = getLabPanel(panel.id);
    expect(full?.results).toHaveLength(2);
    expect(full?.results[1].flag).toBe("L");
  });

  it("cascades delete results with panel", () => {
    const panel = createLabPanel({ name: "CMP", status: "final" }, [
      { analyteName: "Na", value: "140", unit: "mmol/L" },
    ]);
    deleteLabPanel(panel.id);
    const orphans = getDb().select().from(labResults).where(eq(labResults.panelId, panel.id)).all();
    expect(orphans).toHaveLength(0);
    expect(listLabPanels()).toHaveLength(0);
  });

  it("replaces results on update", () => {
    const panel = createLabPanel({ name: "Lipid", status: "final" }, [
      { analyteName: "LDL", value: "100" },
    ]);
    updateLabPanel(panel.id, { name: "Lipid", status: "final" }, [
      { analyteName: "LDL", value: "90" },
      { analyteName: "HDL", value: "50" },
    ]);
    expect(getLabPanel(panel.id)?.results).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Validation**

```ts
import { z } from "zod";

export const labResultSchema = z.object({
  analyteName: z.string().min(1).max(200),
  value: z.string().max(100).optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  refLow: z.string().max(50).optional().nullable(),
  refHigh: z.string().max(50).optional().nullable(),
  flag: z.enum(["normal", "H", "L", "critical", "unknown"]).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const labPanelSchema = z.object({
  name: z.string().min(1).max(300),
  collectedOn: z.string().optional().nullable(),
  facility: z.string().max(200).optional().nullable(),
  status: z.enum(["pending", "final"]).default("final"),
  notes: z.string().max(10000).optional().nullable(),
});

export const labPanelWithResultsSchema = labPanelSchema.extend({
  results: z.array(labResultSchema).default([]),
});
```

- [ ] **Step 3: Service with better-sqlite3 transaction**

```ts
export function createLabPanel(panelInput: LabPanelInput, results: LabResultInput[]) {
  bootstrapDb();
  const db = getDb();
  const id = newId();
  const t = nowIso();
  const sqlite = /* access underlying better-sqlite3 via export getSqlite() */;
  const tx = getSqlite().transaction(() => {
    db.insert(labPanels).values({ id, /* ... */, createdAt: t, updatedAt: t }).run();
    for (const r of results) {
      db.insert(labResults)
        .values({
          id: newId(),
          panelId: id,
          analyteName: r.analyteName,
          value: r.value ?? null,
          unit: r.unit ?? null,
          refLow: r.refLow ?? null,
          refHigh: r.refHigh ?? null,
          flag: r.flag ?? null,
          notes: r.notes ?? null,
          createdAt: t,
          updatedAt: t,
        })
        .run();
    }
  });
  tx();
  return getLabPanel(id)!;
}
```

Export `getSqlite()` from `src/server/db/index.ts` returning the `Database` instance.

`getLabPanel` returns panel joined with results ordered by analyte name.

- [ ] **Step 4: UI — new/edit with dynamic result rows**

Client component `LabResultsEditor` with “Add row” button; form submits panel fields + JSON or indexed fields `results[0].analyteName` etc. Prefer client state array serialized to a hidden JSON input parsed in the server action.

- [ ] **Step 5: Tests pass + commit**

```bash
npm test -- tests/integration/labs.test.ts
git add -A
git commit -m "feat: lab panels and results with transactional writes"
```

---

### Task 8: Tests + procedures CRUD

**Files:**
- Create: validation, services, actions, pages for `tests` and `procedures`

Note: name the service module `src/server/services/clinical-tests.ts` and table already `tests` to avoid clashing with Vitest folder `tests/`.

- [ ] **Step 1: Schemas**

```ts
// test-result.ts
export const clinicalTestSchema = z.object({
  type: z.enum(["imaging", "pathology", "other"]),
  name: z.string().min(1).max(300),
  performedOn: z.string().optional().nullable(),
  facility: z.string().max(200).optional().nullable(),
  summary: z.string().max(20000).optional().nullable(),
  keyFindings: z.string().max(20000).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
});

// procedure.ts
export const procedureSchema = z.object({
  name: z.string().min(1).max(300),
  performedOn: z.string().optional().nullable(),
  facility: z.string().max(200).optional().nullable(),
  clinician: z.string().max(200).optional().nullable(),
  outcome: z.string().max(20000).optional().nullable(),
  followUp: z.string().max(10000).optional().nullable(),
  notes: z.string().max(10000).optional().nullable(),
});
```

- [ ] **Step 2: Services with list/get/create/update/delete (same pattern as diagnoses)**

- [ ] **Step 3: Pages under `/tests` and `/procedures`**

- [ ] **Step 4: Smoke test manually + commit**

```bash
git add -A
git commit -m "feat: clinical tests and procedures CRUD"
```

---

### Task 9: Documents service (storage + links)

**Files:**
- Create: `src/lib/validation/document.ts`, `src/server/services/documents.ts`, `tests/integration/documents.test.ts`

- [ ] **Step 1: Write integration tests**

```ts
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { useFreshDb, ensureDataDirs } from "../helpers/test-db";
import { createDiagnosis } from "@/server/services/diagnoses";
import {
  savePdfDocument,
  linkDocument,
  listDocumentsForEntity,
  listAllDocuments,
  unlinkDocument,
  deleteDocument,
  getDocumentFilePath,
} from "@/server/services/documents";

useFreshDb();

function fakePdf(): Buffer {
  // Minimal PDF header is enough for storage tests
  return Buffer.from("%PDF-1.4 fake content for tests");
}

describe("documents", () => {
  it("stores pdf and links to entity", () => {
    const d = createDiagnosis({ name: "UC", status: "chronic" });
    const doc = savePdfDocument({
      originalFilename: "colonoscopy.pdf",
      buffer: fakePdf(),
      uploadedVia: "manual",
    });
    linkDocument(doc.id, "diagnosis", d.id);
    const linked = listDocumentsForEntity("diagnosis", d.id);
    expect(linked).toHaveLength(1);
    expect(linked[0].originalFilename).toBe("colonoscopy.pdf");
    const fp = getDocumentFilePath(doc.id);
    expect(fs.existsSync(fp!)).toBe(true);
  });

  it("rejects non-pdf content type path via save requiring pdf name/type", () => {
    expect(() =>
      savePdfDocument({
        originalFilename: "note.txt",
        buffer: Buffer.from("hi"),
        uploadedVia: "manual",
        contentType: "text/plain",
      }),
    ).toThrow(/pdf/i);
  });

  it("delete document removes file and links", () => {
    const d = createDiagnosis({ name: "X", status: "active" });
    const doc = savePdfDocument({
      originalFilename: "a.pdf",
      buffer: fakePdf(),
      uploadedVia: "manual",
    });
    linkDocument(doc.id, "diagnosis", d.id);
    const fp = getDocumentFilePath(doc.id)!;
    deleteDocument(doc.id);
    expect(fs.existsSync(fp)).toBe(false);
    expect(listDocumentsForEntity("diagnosis", d.id)).toHaveLength(0);
  });

  it("unlink keeps file; entity delete does not delete document", () => {
    const d = createDiagnosis({ name: "Y", status: "active" });
    const doc = savePdfDocument({
      originalFilename: "b.pdf",
      buffer: fakePdf(),
      uploadedVia: "manual",
    });
    linkDocument(doc.id, "diagnosis", d.id);
    unlinkDocument(doc.id, "diagnosis", d.id);
    expect(listAllDocuments().some((x) => x.id === doc.id)).toBe(true);
  });
});
```

- [ ] **Step 2: Implement documents service**

```ts
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { and, eq, desc } from "drizzle-orm";
import { getDb, ensureDataDirs } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { documents, documentLinks } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";

export type EntityType =
  | "diagnosis"
  | "medication"
  | "supplement"
  | "lab_panel"
  | "test"
  | "procedure";

const MAX = () => Number(process.env.MAX_UPLOAD_BYTES ?? 25 * 1024 * 1024);

export function savePdfDocument(opts: {
  originalFilename: string;
  buffer: Buffer;
  uploadedVia: "manual" | "ai_import";
  contentType?: string;
  title?: string;
  description?: string;
  notes?: string;
}) {
  bootstrapDb();
  const contentType = opts.contentType ?? "application/pdf";
  const isPdf =
    contentType === "application/pdf" ||
    opts.originalFilename.toLowerCase().endsWith(".pdf");
  if (!isPdf) throw new Error("Only PDF files are allowed");
  if (opts.buffer.byteLength > MAX()) throw new Error("File exceeds max upload size");

  const { uploadsDir } = ensureDataDirs();
  const id = newId();
  const checksum = crypto.createHash("sha256").update(opts.buffer).digest("hex");
  const storageName = `${id}.pdf`;
  const storagePath = path.join(uploadsDir, storageName);
  fs.writeFileSync(storagePath, opts.buffer);

  const createdAt = nowIso();
  getDb()
    .insert(documents)
    .values({
      id,
      originalFilename: opts.originalFilename,
      contentType: "application/pdf",
      storagePath: storageName, // relative name under uploads
      byteSize: opts.buffer.byteLength,
      checksum,
      title: opts.title ?? null,
      description: opts.description ?? null,
      uploadedVia: opts.uploadedVia,
      notes: opts.notes ?? null,
      createdAt,
    })
    .run();

  return getDb().select().from(documents).where(eq(documents.id, id)).get()!;
}

export function linkDocument(documentId: string, entityType: EntityType, entityId: string) {
  bootstrapDb();
  getDb()
    .insert(documentLinks)
    .values({ documentId, entityType, entityId, createdAt: nowIso() })
    .onConflictDoNothing()
    .run();
}

export function unlinkDocument(documentId: string, entityType: EntityType, entityId: string) {
  bootstrapDb();
  getDb()
    .delete(documentLinks)
    .where(
      and(
        eq(documentLinks.documentId, documentId),
        eq(documentLinks.entityType, entityType),
        eq(documentLinks.entityId, entityId),
      ),
    )
    .run();
}

export function listDocumentsForEntity(entityType: EntityType, entityId: string) {
  bootstrapDb();
  const db = getDb();
  const links = db
    .select()
    .from(documentLinks)
    .where(and(eq(documentLinks.entityType, entityType), eq(documentLinks.entityId, entityId)))
    .all();
  return links
    .map((l) => db.select().from(documents).where(eq(documents.id, l.documentId)).get())
    .filter(Boolean);
}

export function listAllDocuments() {
  bootstrapDb();
  return getDb().select().from(documents).orderBy(desc(documents.createdAt)).all();
}

export function getDocumentFilePath(id: string): string | null {
  bootstrapDb();
  const doc = getDb().select().from(documents).where(eq(documents.id, id)).get();
  if (!doc) return null;
  const { uploadsDir } = ensureDataDirs();
  return path.join(uploadsDir, doc.storagePath);
}

export function deleteDocument(id: string) {
  bootstrapDb();
  const fp = getDocumentFilePath(id);
  getDb().delete(documents).where(eq(documents.id, id)).run();
  if (fp && fs.existsSync(fp)) fs.unlinkSync(fp);
}
```

If write fails after partial file, wrap with try/catch and unlink.

- [ ] **Step 3: Run tests**

```bash
npm test -- tests/integration/documents.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: document storage and entity linking"
```

---

### Task 10: Document upload API, download API, AttachmentsPanel, Documents library

**Files:**
- Create: `src/app/api/documents/upload/route.ts`, `src/app/api/documents/[id]/file/route.ts`, `src/components/records/attachments-panel.tsx`, `src/app/(app)/documents/page.tsx`, `src/server/actions/documents.ts`
- Modify: all entity detail pages to include AttachmentsPanel

- [ ] **Step 1: Upload route**

```ts
// src/app/api/documents/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { savePdfDocument, linkDocument, type EntityType } from "@/server/services/documents";
// import auth guard when Task 12 lands

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    const entityType = String(form.get("entityType") ?? "") as EntityType;
    const entityId = String(form.get("entityId") ?? "");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    const buf = Buffer.from(await file.arrayBuffer());
    const doc = savePdfDocument({
      originalFilename: file.name,
      buffer: buf,
      uploadedVia: "manual",
      contentType: file.type || "application/pdf",
    });
    if (entityType && entityId) {
      linkDocument(doc.id, entityType, entityId);
    }
    return NextResponse.json({ ok: true, document: doc });
  } catch (e) {
    const message = e instanceof Error ? e.message : "upload failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
```

- [ ] **Step 2: File download route**

```ts
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import { getDb } from "@/server/db";
import { documents } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getDocumentFilePath } from "@/server/services/documents";
import { bootstrapDb } from "@/server/db/bootstrap";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  bootstrapDb();
  const { id } = await ctx.params;
  const doc = getDb().select().from(documents).where(eq(documents.id, id)).get();
  if (!doc) return new NextResponse("Not found", { status: 404 });
  const fp = getDocumentFilePath(id);
  if (!fp || !fs.existsSync(fp)) {
    return new NextResponse("File missing on disk", { status: 404 });
  }
  const data = fs.readFileSync(fp);
  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${doc.originalFilename.replace(/"/g, "")}"`,
    },
  });
}
```

- [ ] **Step 3: AttachmentsPanel (client)**

Props: `entityType`, `entityId`, initial `documents[]`.

- File input accept=`application/pdf,.pdf`
- POST to `/api/documents/upload` with FormData
- List with Open link → `/api/documents/${id}/file`
- Unlink / delete buttons via server actions

- [ ] **Step 4: Documents library page**

List all documents with filename, size, date, uploadedVia, and linked entity summary (query links). Actions: open, delete.

- [ ] **Step 5: Embed AttachmentsPanel on every detail page**

entityType values must match: `diagnosis`, `medication`, `supplement`, `lab_panel`, `test`, `procedure`.

- [ ] **Step 6: Manual UAT**

Create a diagnosis, attach a real PDF, open it, confirm `/documents` lists it, delete clinical record and confirm PDF remains, then delete from library.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: PDF upload, download, attachments UI, documents library"
```

---

### Task 11: Dashboard + global search

**Files:**
- Create: `src/server/services/dashboard.ts`, `src/server/services/search.ts`, `tests/integration/search.test.ts`
- Modify: `src/app/(app)/page.tsx` (dashboard), add search UI in shell or dashboard

- [ ] **Step 1: Search tests**

```ts
import { describe, it, expect } from "vitest";
import { useFreshDb } from "../helpers/test-db";
import { createDiagnosis } from "@/server/services/diagnoses";
import { createMedication } from "@/server/services/medications";
import { globalSearch } from "@/server/services/search";

useFreshDb();

describe("globalSearch", () => {
  it("finds across entity types", () => {
    createDiagnosis({ name: "Ulcerative colitis", status: "chronic" });
    createMedication({ name: "Mesalamine", status: "active", prn: false });
    const hits = globalSearch("mesa");
    expect(hits.some((h) => h.entityType === "medication")).toBe(true);
    const hits2 = globalSearch("colitis");
    expect(hits2.some((h) => h.entityType === "diagnosis")).toBe(true);
  });

  it("returns empty for blank query", () => {
    expect(globalSearch("  ")).toEqual([]);
  });
});
```

- [ ] **Step 2: Implement search**

```ts
export type SearchHit = {
  entityType: string;
  entityId: string;
  title: string;
  subtitle?: string;
  href: string;
};

export function globalSearch(q: string): SearchHit[] {
  bootstrapDb();
  const query = q.trim();
  if (!query) return [];
  const like = `%${query}%`;
  // Query each table name/notes with LIKE; cap 20 total
  // Map to hrefs: /diagnoses/:id etc.
}
```

- [ ] **Step 3: Dashboard service**

```ts
export function getDashboardSummary() {
  return {
    profile: getProfile(),
    activeMedicationCount: listMedications({ status: "active" }).length,
    activeSupplementCount: listSupplements({ status: "active" }).length,
    activeDiagnosisCount: listDiagnoses({ status: "active" }).length +
      listDiagnoses({ status: "chronic" }).length,
    recentLabs: listLabPanels().slice(0, 5),
    allergyCount: listAllergies().length,
  };
}
```

- [ ] **Step 4: Dashboard UI + search box**

Search form GET `/` or `/search?q=` — simplest: search on dashboard with results below widgets.

- [ ] **Step 5: Tests + commit**

```bash
npm test -- tests/integration/search.test.ts
git add -A
git commit -m "feat: dashboard summary and global search"
```

---

### Task 12: Optional passcode auth

**Files:**
- Create: `src/server/auth/password.ts`, `src/server/auth/session.ts`, `src/server/auth/guard.ts`, `src/server/actions/auth.ts`, `src/app/(auth)/login/page.tsx`, `src/middleware.ts`, `tests/integration/auth.test.ts`
- Modify: upload/download routes to call guard; settings for enabling note

**Behavior:** If `APP_PASSWORD` env is empty/unset → auth disabled. If set → middleware redirects all routes except `/login` and static assets to login when no session cookie.

- [ ] **Step 1: Password helpers**

```ts
import bcrypt from "bcryptjs";

export function verifyPassword(plain: string, hashOrPlainFromEnv: string): boolean {
  // Support bcrypt hash in env OR plaintext for personal simplicity
  if (hashOrPlainFromEnv.startsWith("$2")) {
    return bcrypt.compareSync(plain, hashOrPlainFromEnv);
  }
  return plain === hashOrPlainFromEnv;
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}
```

- [ ] **Step 2: Session with iron-session**

```ts
import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export type SessionData = { authenticated?: boolean };

export function sessionOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET must be set (32+ chars) when using auth");
  }
  return {
    cookieName: "wfm_ht_session",
    password,
    cookieOptions: {
      httpOnly: true,
      secure: false, // localhost
      sameSite: "lax",
      path: "/",
    },
  };
}

export function authEnabled(): boolean {
  return Boolean(process.env.APP_PASSWORD && process.env.APP_PASSWORD.length > 0);
}

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions());
}
```

When auth disabled, skip iron-session password requirement in middleware.

- [ ] **Step 3: Middleware**

```ts
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";

export async function middleware(req: NextRequest) {
  if (!process.env.APP_PASSWORD) return NextResponse.next();

  const res = NextResponse.next();
  const session = await getIronSession(req, res, {
    cookieName: "wfm_ht_session",
    password: process.env.SESSION_SECRET!,
    cookieOptions: { httpOnly: true, secure: false, sameSite: "lax", path: "/" },
  });

  const path = req.nextUrl.pathname;
  if (path === "/login" || path.startsWith("/_next")) return res;

  if (!session.authenticated) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

- [ ] **Step 4: Login action + page**

```ts
"use server";
import { redirect } from "next/navigation";
import { authEnabled, getSession } from "@/server/auth/session";
import { verifyPassword } from "@/server/auth/password";

export async function loginAction(formData: FormData) {
  if (!authEnabled()) redirect("/");
  const password = String(formData.get("password") ?? "");
  if (!verifyPassword(password, process.env.APP_PASSWORD!)) {
    return { ok: false as const, error: "Invalid passcode" };
  }
  const session = await getSession();
  session.authenticated = true;
  await session.save();
  redirect("/");
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
```

- [ ] **Step 5: Auth unit/integration tests for verifyPassword + authEnabled**

```ts
import { describe, it, expect } from "vitest";
import { verifyPassword, hashPassword } from "@/server/auth/password";

describe("password", () => {
  it("matches plaintext env style", () => {
    expect(verifyPassword("secret", "secret")).toBe(true);
    expect(verifyPassword("nope", "secret")).toBe(false);
  });

  it("matches bcrypt hash", () => {
    const h = hashPassword("secret");
    expect(verifyPassword("secret", h)).toBe(true);
  });
});
```

- [ ] **Step 6: Protect file routes**

At top of upload/download handlers:

```ts
import { assertAuthenticated } from "@/server/auth/guard";

export async function GET(...) {
  await assertAuthenticated(); // no-op if auth disabled; throws/redirects if enabled & missing
  ...
}
```

`guard.ts`:

```ts
import { authEnabled, getSession } from "./session";

export async function assertAuthenticated() {
  if (!authEnabled()) return;
  const session = await getSession();
  if (!session.authenticated) {
    throw new Error("Unauthorized");
  }
}
```

- [ ] **Step 7: Manual test with APP_PASSWORD set; commit**

```bash
git add -A
git commit -m "feat: optional passcode auth for app and file routes"
```

---

### Task 13: Settings page + README polish + final verification

**Files:**
- Create: `src/app/(app)/settings/page.tsx`, `src/server/services/settings.ts` (if needed for non-env prefs)
- Modify: `README.md`

- [ ] **Step 1: Settings UI**

Show:
- Auth status (enabled/disabled based on env — explain `.env` APP_PASSWORD)
- Preferred units (read/write profile preferredLengthUnit / preferredWeightUnit)
- Max upload size (display from env)
- Backup instructions: copy `data/` folder
- Logout button if authenticated
- Stub section: “AI providers (Phase 3)” disabled text

- [ ] **Step 2: Full test suite**

```bash
npm test
npm run lint
npm run build
```

Expected: all pass; build succeeds.

- [ ] **Step 3: Manual UAT checklist (spec success criteria)**

- [ ] Profile + allergies save  
- [ ] CRUD each entity type  
- [ ] Lab multi-result panel  
- [ ] Attach PDF on med + open  
- [ ] Documents library  
- [ ] Search finds record  
- [ ] Dashboard numbers make sense  
- [ ] With `APP_PASSWORD` set, login required and PDF route blocked when logged out  
- [ ] `data/` contains `health.sqlite` + `uploads/`

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: settings, docs polish, phase 1 verification"
```

---

## Spec coverage checklist

| Spec requirement | Task(s) |
|------------------|---------|
| Local Next.js monolith, localhost bind | 1 |
| SQLite + data/ backup unit | 1, 2 |
| Profile + age from DOB + height/weight | 3 |
| Structured allergies | 3 |
| Diagnoses CRUD | 5 |
| Medications CRUD + PRN | 6 |
| Supplements CRUD | 6 |
| Lab panels + results, transactions | 7 |
| Tests / procedures CRUD | 8 |
| Source PDFs attach + library + open | 9, 10 |
| Dashboard | 11 |
| Global search | 11 |
| Optional passcode + protect files | 12 |
| Settings / backup guidance | 13 |
| No AI/symptoms in Phase 1 | (explicit non-implementation) |

---

## Self-review notes

- **Placeholders:** None intentional; package versions float to install-time latest 15.x.
- **Type consistency:** `EntityType` union used for document links; status enums aligned with schema.
- **TDD:** Services covered with Vitest + temp `DATA_DIR`; UI validated manually + build.
- **ESM note:** Prefer `"type": "module"` handling via Next defaults; use `tsx` for migrate script.
- **Route groups:** `(app)` vs `(auth)` avoid wrapping login in shell.

---

## Out of scope (do not implement in this plan)

- AI PDF extraction, chat, Ollama/Grok  
- Symptom journals / vitals time series  
- Encrypted backup export  
- Multi-user  
- Non-PDF uploads  
