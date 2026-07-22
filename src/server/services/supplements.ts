import { eq, desc, and, or, like, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { supplements } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import type { SupplementInput } from "@/lib/validation/supplement";

export function listSupplements(filter?: { status?: string; q?: string }) {
  bootstrapDb();
  const conditions: SQL[] = [];

  if (filter?.status) {
    conditions.push(eq(supplements.status, filter.status));
  }

  if (filter?.q?.trim()) {
    const pattern = `%${filter.q.trim()}%`;
    conditions.push(
      or(
        like(supplements.name, pattern),
        like(supplements.notes, pattern),
        like(supplements.purpose, pattern),
        like(supplements.dose, pattern),
      )!,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return getDb()
    .select()
    .from(supplements)
    .where(where)
    .orderBy(desc(supplements.createdAt))
    .all();
}

export function getSupplement(id: string) {
  bootstrapDb();
  return getDb().select().from(supplements).where(eq(supplements.id, id)).get();
}

export function createSupplement(input: SupplementInput) {
  bootstrapDb();
  const id = newId();
  const t = nowIso();
  getDb()
    .insert(supplements)
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
      notes: input.notes || null,
      source: "manual",
      createdAt: t,
      updatedAt: t,
    })
    .run();
  return getDb().select().from(supplements).where(eq(supplements.id, id)).get()!;
}

export function updateSupplement(id: string, input: SupplementInput) {
  bootstrapDb();
  getDb()
    .update(supplements)
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
      notes: input.notes || null,
      updatedAt: nowIso(),
    })
    .where(eq(supplements.id, id))
    .run();
  return getDb().select().from(supplements).where(eq(supplements.id, id)).get()!;
}

export function deleteSupplement(id: string) {
  bootstrapDb();
  getDb().delete(supplements).where(eq(supplements.id, id)).run();
}
