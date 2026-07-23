import { pathToFileURL } from "node:url";
import { sql } from "drizzle-orm";
import { getDb, getSqlite, ensureDataDirs } from "./index";

/** Apply schema via drizzle push-style SQL for simplicity in Phase 1. */
export function migrate() {
  ensureDataDirs();
  const db = getDb();
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
    how_it_helps TEXT,
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
    how_it_helps TEXT,
    prescriber TEXT,
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
    diagnosis TEXT,
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
    diagnosis TEXT,
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
  db.run(sql`CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    specialty TEXT,
    organization TEXT,
    phone TEXT,
    email TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS analytes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    default_unit TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS import_jobs (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id),
    status TEXT NOT NULL,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    error_message TEXT,
    extracted_char_count INTEGER,
    cloud_confirmed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS draft_lab_panels (
    id TEXT PRIMARY KEY,
    import_job_id TEXT NOT NULL REFERENCES import_jobs(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    name TEXT NOT NULL,
    collected_on TEXT,
    facility TEXT,
    status TEXT NOT NULL DEFAULT 'final',
    notes TEXT,
    review_status TEXT NOT NULL DEFAULT 'pending',
    committed_entity_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS draft_lab_results (
    id TEXT PRIMARY KEY,
    draft_panel_id TEXT NOT NULL REFERENCES draft_lab_panels(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
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
  db.run(sql`CREATE TABLE IF NOT EXISTS personas (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    specialty TEXT,
    description TEXT,
    system_prompt_default TEXT NOT NULL,
    system_prompt_override TEXT,
    is_builtin INTEGER NOT NULL DEFAULT 0,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS persona_views (
    id TEXT PRIMARY KEY,
    persona_id TEXT NOT NULL REFERENCES personas(id),
    status TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 0,
    title TEXT,
    body_md TEXT NOT NULL,
    sections_json TEXT,
    topics_json TEXT,
    citations_json TEXT,
    fact_opinion_json TEXT,
    provider TEXT,
    model TEXT,
    parent_view_id TEXT,
    focus_note TEXT,
    created_at TEXT NOT NULL,
    accepted_at TEXT,
    updated_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS my_plan (
    id TEXT PRIMARY KEY,
    body_md TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS chat_threads (
    id TEXT PRIMARY KEY,
    title TEXT,
    persona_id TEXT REFERENCES personas(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
  db.run(sql`CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    created_at TEXT NOT NULL
  )`);

  // Additive migrations for existing DBs (CREATE TABLE IF NOT EXISTS won't alter columns)
  ensureColumn("medications", "how_it_helps", "TEXT");
  ensureColumn("supplements", "how_it_helps", "TEXT");
  ensureColumn("supplements", "prescriber", "TEXT");
  ensureColumn("tests", "diagnosis", "TEXT");
  ensureColumn("procedures", "diagnosis", "TEXT");

  seedBuiltinPersonas();
}

/** Built-in personas with short placeholder prompts (full prompts expanded in Task 2). */
const BUILTIN_PERSONAS: Array<{
  id: string;
  slug: string;
  name: string;
  specialty: string;
  description: string;
  systemPromptDefault: string;
  sortOrder: number;
}> = [
  {
    id: "gi",
    slug: "gi",
    name: "Gastroenterologist",
    specialty: "Gastroenterology",
    description: "GI-focused lens on IBD, symptoms, and related therapies.",
    systemPromptDefault:
      "You are an assistive gastroenterology-oriented reviewer of a personal health chart. Emphasize GI diagnoses, symptoms, procedures, and related meds. Separate chart facts from opinions. Not a substitute for clinical care.",
    sortOrder: 10,
  },
  {
    id: "pcp",
    slug: "pcp",
    name: "Primary care / internist",
    specialty: "Primary care",
    description: "Whole-person primary care and care coordination lens.",
    systemPromptDefault:
      "You are an assistive primary care / internal medicine reviewer. Integrate multi-system issues, preventive care gaps, and care coordination. Separate chart facts from opinions. Not a substitute for clinical care.",
    sortOrder: 20,
  },
  {
    id: "pharmacist",
    slug: "pharmacist",
    name: "Clinical pharmacist",
    specialty: "Clinical pharmacy",
    description: "Medication and supplement interaction and safety focus.",
    systemPromptDefault:
      "You are an assistive clinical pharmacist reviewing a personal health chart. Focus on meds, supplements, dosing, interactions, and adherence risks. Separate chart facts from opinions. Not a substitute for clinical care.",
    sortOrder: 30,
  },
  {
    id: "functional",
    slug: "functional",
    name: "Functional / integrative medicine",
    specialty: "Functional medicine",
    description: "Root-cause and lifestyle-oriented integrative lens.",
    systemPromptDefault:
      "You are an assistive functional/integrative medicine reviewer. Consider lifestyle, nutrition, and root-cause hypotheses while grounding claims in chart data. Separate chart facts from opinions. Not a substitute for clinical care.",
    sortOrder: 40,
  },
  {
    id: "urologist",
    slug: "urologist",
    name: "Urologist",
    specialty: "Urology",
    description: "Urologic conditions, labs, and procedures.",
    systemPromptDefault:
      "You are an assistive urology-oriented reviewer of a personal health chart. Focus on urologic diagnoses, labs, procedures, and related therapies. Separate chart facts from opinions. Not a substitute for clinical care.",
    sortOrder: 50,
  },
  {
    id: "nutritionist",
    slug: "nutritionist",
    name: "PhD Nutritionist",
    specialty: "Nutrition",
    description: "Diet, nutrients, and evidence-aware nutrition guidance.",
    systemPromptDefault:
      "You are an assistive PhD nutritionist reviewing a personal health chart. Focus on diet-relevant labs, deficiencies, and nutrition-related goals. Separate chart facts from opinions. Not a substitute for clinical care.",
    sortOrder: 60,
  },
  {
    id: "cardiologist",
    slug: "cardiologist",
    name: "Cardiologist",
    specialty: "Cardiology",
    description: "Cardiovascular risk, meds, and cardiac findings.",
    systemPromptDefault:
      "You are an assistive cardiology-oriented reviewer of a personal health chart. Focus on CV risk factors, cardiac meds, and relevant labs. Separate chart facts from opinions. Not a substitute for clinical care.",
    sortOrder: 70,
  },
];

/**
 * Idempotent seed: insert built-ins if missing; refresh system_prompt_default only
 * (does not wipe system_prompt_override).
 */
export function seedBuiltinPersonas() {
  const sqlite = getSqlite();
  const now = new Date().toISOString();
  const selectStmt = sqlite.prepare(`SELECT id FROM personas WHERE id = ?`);
  const insertStmt = sqlite.prepare(`
    INSERT INTO personas (
      id, slug, name, specialty, description,
      system_prompt_default, system_prompt_override,
      is_builtin, is_enabled, sort_order, created_at, updated_at
    ) VALUES (
      @id, @slug, @name, @specialty, @description,
      @system_prompt_default, NULL,
      1, 1, @sort_order, @created_at, @updated_at
    )
  `);
  const updateDefaultStmt = sqlite.prepare(`
    UPDATE personas
    SET system_prompt_default = @system_prompt_default,
        name = @name,
        specialty = @specialty,
        description = @description,
        sort_order = @sort_order,
        is_builtin = 1,
        updated_at = @updated_at
    WHERE id = @id
  `);

  for (const p of BUILTIN_PERSONAS) {
    const existing = selectStmt.get(p.id) as { id: string } | undefined;
    if (!existing) {
      insertStmt.run({
        id: p.id,
        slug: p.slug,
        name: p.name,
        specialty: p.specialty,
        description: p.description,
        system_prompt_default: p.systemPromptDefault,
        sort_order: p.sortOrder,
        created_at: now,
        updated_at: now,
      });
    } else {
      updateDefaultStmt.run({
        id: p.id,
        system_prompt_default: p.systemPromptDefault,
        name: p.name,
        specialty: p.specialty,
        description: p.description,
        sort_order: p.sortOrder,
        updated_at: now,
      });
    }
  }
}

function ensureColumn(table: string, column: string, typeSql: string) {
  const sqlite = getSqlite();
  const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  if (rows.some((r) => r.name === column)) return;
  sqlite.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeSql}`);
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  migrate();
  console.log("Migrations applied");
}
