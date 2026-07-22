import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import { resetBootstrapForTests } from "./bootstrap";

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

/** Raw better-sqlite3 handle for transactions and advanced SQL. */
export function getSqlite(): Database.Database {
  getDb();
  if (!_sqlite) throw new Error("SQLite not initialized");
  return _sqlite;
}

/** Test-only: reset singleton so a new DATA_DIR is picked up. */
export function resetDbForTests() {
  if (_sqlite) _sqlite.close();
  _db = null;
  _sqlite = null;
  resetBootstrapForTests();
}

export type AppDb = ReturnType<typeof getDb>;
