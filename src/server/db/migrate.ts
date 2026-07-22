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

  // Additive migrations for existing DBs (CREATE TABLE IF NOT EXISTS won't alter columns)
  ensureColumn("medications", "how_it_helps", "TEXT");
  ensureColumn("supplements", "how_it_helps", "TEXT");
  ensureColumn("supplements", "prescriber", "TEXT");
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
