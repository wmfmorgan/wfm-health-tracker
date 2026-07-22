import { eq, desc, and, or, like, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { tests } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import type { ClinicalTestInput } from "@/lib/validation/test-result";
import { unlinkAllForEntity } from "@/server/services/documents";

export function listClinicalTests(filter?: { type?: string; q?: string }) {
  bootstrapDb();
  const conditions: SQL[] = [];

  if (filter?.type) {
    conditions.push(eq(tests.type, filter.type));
  }

  if (filter?.q?.trim()) {
    const pattern = `%${filter.q.trim()}%`;
    conditions.push(
      or(
        like(tests.name, pattern),
        like(tests.notes, pattern),
        like(tests.facility, pattern),
        like(tests.diagnosis, pattern),
        like(tests.summary, pattern),
        like(tests.keyFindings, pattern),
      )!,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return getDb()
    .select()
    .from(tests)
    .where(where)
    .orderBy(desc(tests.createdAt))
    .all();
}

export function getClinicalTest(id: string) {
  bootstrapDb();
  return getDb().select().from(tests).where(eq(tests.id, id)).get();
}

export function createClinicalTest(input: ClinicalTestInput) {
  bootstrapDb();
  const id = newId();
  const t = nowIso();
  getDb()
    .insert(tests)
    .values({
      id,
      type: input.type,
      name: input.name,
      performedOn: input.performedOn || null,
      facility: input.facility || null,
      diagnosis: input.diagnosis || null,
      summary: input.summary || null,
      keyFindings: input.keyFindings || null,
      notes: input.notes || null,
      source: "manual",
      createdAt: t,
      updatedAt: t,
    })
    .run();
  return getDb().select().from(tests).where(eq(tests.id, id)).get()!;
}

export function updateClinicalTest(id: string, input: ClinicalTestInput) {
  bootstrapDb();
  getDb()
    .update(tests)
    .set({
      type: input.type,
      name: input.name,
      performedOn: input.performedOn || null,
      facility: input.facility || null,
      diagnosis: input.diagnosis || null,
      summary: input.summary || null,
      keyFindings: input.keyFindings || null,
      notes: input.notes || null,
      updatedAt: nowIso(),
    })
    .where(eq(tests.id, id))
    .run();
  return getDb().select().from(tests).where(eq(tests.id, id)).get()!;
}

export function deleteClinicalTest(id: string) {
  bootstrapDb();
  unlinkAllForEntity("test", id);
  getDb().delete(tests).where(eq(tests.id, id)).run();
}
