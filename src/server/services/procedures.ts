import { eq, desc, and, or, like, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { procedures } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import type { ProcedureInput } from "@/lib/validation/procedure";
import { unlinkAllForEntity } from "@/server/services/documents";

export function listProcedures(filter?: { q?: string }) {
  bootstrapDb();
  const conditions: SQL[] = [];

  if (filter?.q?.trim()) {
    const pattern = `%${filter.q.trim()}%`;
    conditions.push(
      or(
        like(procedures.name, pattern),
        like(procedures.notes, pattern),
        like(procedures.facility, pattern),
        like(procedures.clinician, pattern),
        like(procedures.outcome, pattern),
        like(procedures.followUp, pattern),
      )!,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return getDb()
    .select()
    .from(procedures)
    .where(where)
    .orderBy(desc(procedures.createdAt))
    .all();
}

export function getProcedure(id: string) {
  bootstrapDb();
  return getDb().select().from(procedures).where(eq(procedures.id, id)).get();
}

export function createProcedure(input: ProcedureInput) {
  bootstrapDb();
  const id = newId();
  const t = nowIso();
  getDb()
    .insert(procedures)
    .values({
      id,
      name: input.name,
      performedOn: input.performedOn || null,
      facility: input.facility || null,
      clinician: input.clinician || null,
      outcome: input.outcome || null,
      followUp: input.followUp || null,
      notes: input.notes || null,
      source: "manual",
      createdAt: t,
      updatedAt: t,
    })
    .run();
  return getDb().select().from(procedures).where(eq(procedures.id, id)).get()!;
}

export function updateProcedure(id: string, input: ProcedureInput) {
  bootstrapDb();
  getDb()
    .update(procedures)
    .set({
      name: input.name,
      performedOn: input.performedOn || null,
      facility: input.facility || null,
      clinician: input.clinician || null,
      outcome: input.outcome || null,
      followUp: input.followUp || null,
      notes: input.notes || null,
      updatedAt: nowIso(),
    })
    .where(eq(procedures.id, id))
    .run();
  return getDb().select().from(procedures).where(eq(procedures.id, id)).get()!;
}

export function deleteProcedure(id: string) {
  bootstrapDb();
  unlinkAllForEntity("procedure", id);
  getDb().delete(procedures).where(eq(procedures.id, id)).run();
}
