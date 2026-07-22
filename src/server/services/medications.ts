import { eq, desc, and, or, like, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { medications } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import type { MedicationInput } from "@/lib/validation/medication";

export function listMedications(filter?: { status?: string; q?: string }) {
  bootstrapDb();
  const conditions: SQL[] = [];

  if (filter?.status) {
    conditions.push(eq(medications.status, filter.status));
  }

  if (filter?.q?.trim()) {
    const pattern = `%${filter.q.trim()}%`;
    conditions.push(
      or(
        like(medications.name, pattern),
        like(medications.notes, pattern),
        like(medications.purpose, pattern),
        like(medications.prescriber, pattern),
        like(medications.dose, pattern),
      )!,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return getDb()
    .select()
    .from(medications)
    .where(where)
    .orderBy(desc(medications.createdAt))
    .all();
}

export function getMedication(id: string) {
  bootstrapDb();
  return getDb().select().from(medications).where(eq(medications.id, id)).get();
}

export function createMedication(input: MedicationInput) {
  bootstrapDb();
  const id = newId();
  const t = nowIso();
  getDb()
    .insert(medications)
    .values({
      id,
      name: input.name,
      dose: input.dose || null,
      form: input.form || null,
      route: input.route || null,
      frequency: input.frequency || null,
      prn: input.prn ?? false,
      startOn: input.startOn || null,
      endOn: input.endOn || null,
      status: input.status,
      purpose: input.purpose || null,
      prescriber: input.prescriber || null,
      notes: input.notes || null,
      source: "manual",
      createdAt: t,
      updatedAt: t,
    })
    .run();
  return getDb().select().from(medications).where(eq(medications.id, id)).get()!;
}

export function updateMedication(id: string, input: MedicationInput) {
  bootstrapDb();
  getDb()
    .update(medications)
    .set({
      name: input.name,
      dose: input.dose || null,
      form: input.form || null,
      route: input.route || null,
      frequency: input.frequency || null,
      prn: input.prn ?? false,
      startOn: input.startOn || null,
      endOn: input.endOn || null,
      status: input.status,
      purpose: input.purpose || null,
      prescriber: input.prescriber || null,
      notes: input.notes || null,
      updatedAt: nowIso(),
    })
    .where(eq(medications.id, id))
    .run();
  return getDb().select().from(medications).where(eq(medications.id, id)).get()!;
}

export function deleteMedication(id: string) {
  bootstrapDb();
  getDb().delete(medications).where(eq(medications.id, id)).run();
}
