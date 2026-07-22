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
