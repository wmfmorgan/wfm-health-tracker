import { eq, desc, and, or, like, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { diagnoses } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import type { DiagnosisInput } from "@/lib/validation/diagnosis";

export function listDiagnoses(filter?: { status?: string; q?: string }) {
  bootstrapDb();
  const conditions: SQL[] = [];

  if (filter?.status) {
    conditions.push(eq(diagnoses.status, filter.status));
  }

  if (filter?.q?.trim()) {
    const pattern = `%${filter.q.trim()}%`;
    conditions.push(
      or(
        like(diagnoses.name, pattern),
        like(diagnoses.notes, pattern),
        like(diagnoses.icdCode, pattern),
      )!,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return getDb()
    .select()
    .from(diagnoses)
    .where(where)
    .orderBy(desc(diagnoses.createdAt))
    .all();
}

export function getDiagnosis(id: string) {
  bootstrapDb();
  return getDb().select().from(diagnoses).where(eq(diagnoses.id, id)).get();
}

export function createDiagnosis(input: DiagnosisInput) {
  bootstrapDb();
  const id = newId();
  const t = nowIso();
  getDb()
    .insert(diagnoses)
    .values({
      id,
      name: input.name,
      status: input.status,
      diagnosedOn: input.diagnosedOn || null,
      icdCode: input.icdCode || null,
      clinician: input.clinician || null,
      facility: input.facility || null,
      notes: input.notes || null,
      source: "manual",
      createdAt: t,
      updatedAt: t,
    })
    .run();
  return getDb().select().from(diagnoses).where(eq(diagnoses.id, id)).get()!;
}

export function updateDiagnosis(id: string, input: DiagnosisInput) {
  bootstrapDb();
  getDb()
    .update(diagnoses)
    .set({
      name: input.name,
      status: input.status,
      diagnosedOn: input.diagnosedOn || null,
      icdCode: input.icdCode || null,
      clinician: input.clinician || null,
      facility: input.facility || null,
      notes: input.notes || null,
      updatedAt: nowIso(),
    })
    .where(eq(diagnoses.id, id))
    .run();
  return getDb().select().from(diagnoses).where(eq(diagnoses.id, id)).get()!;
}

export function deleteDiagnosis(id: string) {
  bootstrapDb();
  getDb().delete(diagnoses).where(eq(diagnoses.id, id)).run();
}
