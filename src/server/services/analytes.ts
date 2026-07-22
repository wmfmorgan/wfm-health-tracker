import { eq, asc, like } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { analytes, labResults, appSettings } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import type { AnalyteInput } from "@/lib/validation/analyte";
import { COMMON_ANALYTES } from "@/server/services/common-analytes";

const COMMON_SEED_KEY = "common_analytes_seeded_v1";

/** Seed built-in common analytes (idempotent; safe to call often). */
export function seedCommonAnalytes() {
  bootstrapDb();
  const db = getDb();
  const flag = db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, COMMON_SEED_KEY))
    .get();
  if (flag?.value === "1") return;

  const existing = new Set(
    db
      .select({ name: analytes.name })
      .from(analytes)
      .all()
      .map((r) => r.name.toLowerCase()),
  );
  const t = nowIso();
  for (const row of COMMON_ANALYTES) {
    const key = row.name.toLowerCase();
    if (existing.has(key)) {
      // Fill missing default unit on existing match
      const current = db
        .select()
        .from(analytes)
        .all()
        .find((a) => a.name.toLowerCase() === key);
      if (current && !current.defaultUnit && row.defaultUnit) {
        db.update(analytes)
          .set({
            defaultUnit: row.defaultUnit,
            notes: current.notes ?? row.notes ?? null,
            updatedAt: t,
          })
          .where(eq(analytes.id, current.id))
          .run();
      }
      continue;
    }
    db.insert(analytes)
      .values({
        id: newId(),
        name: row.name,
        defaultUnit: row.defaultUnit,
        notes: row.notes ?? null,
        createdAt: t,
        updatedAt: t,
      })
      .run();
    existing.add(key);
  }

  if (flag) {
    db.update(appSettings)
      .set({ value: "1" })
      .where(eq(appSettings.key, COMMON_SEED_KEY))
      .run();
  } else {
    db.insert(appSettings).values({ key: COMMON_SEED_KEY, value: "1" }).run();
  }
}

/** Import distinct names from existing lab_results into the master list (idempotent). */
export function seedAnalytesFromLabResults() {
  bootstrapDb();
  const db = getDb();
  const existing = new Set(
    db
      .select({ name: analytes.name })
      .from(analytes)
      .all()
      .map((r) => r.name.toLowerCase()),
  );
  const fromResults = db.select({ name: labResults.analyteName }).from(labResults).all();
  const t = nowIso();
  for (const row of fromResults) {
    const name = row.name?.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (existing.has(key)) continue;
    db.insert(analytes)
      .values({
        id: newId(),
        name,
        defaultUnit: null,
        notes: null,
        createdAt: t,
        updatedAt: t,
      })
      .run();
    existing.add(key);
  }
}

export function listAnalytes(filter?: { q?: string }) {
  bootstrapDb();
  seedCommonAnalytes();
  seedAnalytesFromLabResults();
  if (filter?.q?.trim()) {
    const pattern = `%${filter.q.trim()}%`;
    return getDb()
      .select()
      .from(analytes)
      .where(like(analytes.name, pattern))
      .orderBy(asc(analytes.name))
      .all();
  }
  return getDb().select().from(analytes).orderBy(asc(analytes.name)).all();
}

export function getAnalyte(id: string) {
  bootstrapDb();
  return getDb().select().from(analytes).where(eq(analytes.id, id)).get();
}

export function getAnalyteByName(name: string) {
  bootstrapDb();
  const trimmed = name.trim();
  return getDb()
    .select()
    .from(analytes)
    .all()
    .find((a) => a.name.toLowerCase() === trimmed.toLowerCase());
}

export function createAnalyte(input: AnalyteInput) {
  bootstrapDb();
  const name = input.name.trim();
  const existing = getAnalyteByName(name);
  if (existing) {
    if (input.defaultUnit && !existing.defaultUnit) {
      getDb()
        .update(analytes)
        .set({ defaultUnit: input.defaultUnit, updatedAt: nowIso() })
        .where(eq(analytes.id, existing.id))
        .run();
      return getAnalyte(existing.id)!;
    }
    return existing;
  }
  const id = newId();
  const t = nowIso();
  getDb()
    .insert(analytes)
    .values({
      id,
      name,
      defaultUnit: emptyToNull(input.defaultUnit),
      notes: emptyToNull(input.notes),
      createdAt: t,
      updatedAt: t,
    })
    .run();
  return getAnalyte(id)!;
}

/** Ensure analyte exists when saving lab results; optionally set default unit. */
export function ensureAnalyte(name: string, unit?: string | null) {
  return createAnalyte({
    name,
    defaultUnit: unit ?? null,
    notes: null,
  });
}

export function updateAnalyte(id: string, input: AnalyteInput) {
  bootstrapDb();
  getDb()
    .update(analytes)
    .set({
      name: input.name.trim(),
      defaultUnit: emptyToNull(input.defaultUnit),
      notes: emptyToNull(input.notes),
      updatedAt: nowIso(),
    })
    .where(eq(analytes.id, id))
    .run();
  return getAnalyte(id)!;
}

export function deleteAnalyte(id: string) {
  bootstrapDb();
  getDb().delete(analytes).where(eq(analytes.id, id)).run();
}

function emptyToNull(v: string | null | undefined) {
  if (v == null || v === "") return null;
  return v;
}
