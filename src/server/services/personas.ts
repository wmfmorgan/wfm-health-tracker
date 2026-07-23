import { asc, eq } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { seedBuiltinPersonas } from "@/server/db/migrate";
import { personas } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import {
  createCustomPersonaSchema,
  updatePersonaSchema,
  type CreateCustomPersonaInput,
  type UpdatePersonaInput,
} from "@/lib/validation/persona";

export function ensurePersonasSeeded() {
  bootstrapDb();
  seedBuiltinPersonas();
}

export function listPersonas(opts?: { enabledOnly?: boolean }) {
  bootstrapDb();
  const db = getDb();
  if (opts?.enabledOnly) {
    return db
      .select()
      .from(personas)
      .where(eq(personas.isEnabled, true))
      .orderBy(asc(personas.sortOrder), asc(personas.name))
      .all();
  }
  return db
    .select()
    .from(personas)
    .orderBy(asc(personas.sortOrder), asc(personas.name))
    .all();
}

export function getPersona(id: string) {
  bootstrapDb();
  return getDb().select().from(personas).where(eq(personas.id, id)).get();
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return base || "persona";
}

function uniqueCustomSlug(name: string): string {
  const base = slugify(name);
  const suffix = newId().slice(0, 8);
  return `${base}-${suffix}`;
}

export function createCustomPersona(input: CreateCustomPersonaInput) {
  bootstrapDb();
  const data = createCustomPersonaSchema.parse(input);
  const id = newId();
  const t = nowIso();
  const slug = uniqueCustomSlug(data.name);

  // Place custom personas after built-ins
  const existing = listPersonas();
  const maxOrder = existing.reduce((m, p) => Math.max(m, p.sortOrder), 0);

  getDb()
    .insert(personas)
    .values({
      id,
      slug,
      name: data.name.trim(),
      specialty: data.specialty?.trim() || null,
      description: data.description?.trim() || null,
      systemPromptDefault: data.systemPromptDefault.trim(),
      systemPromptOverride: null,
      isBuiltin: false,
      isEnabled: true,
      sortOrder: maxOrder + 10,
      createdAt: t,
      updatedAt: t,
    })
    .run();

  return getPersona(id)!;
}

export function updatePersona(id: string, input: UpdatePersonaInput) {
  bootstrapDb();
  const data = updatePersonaSchema.parse(input);
  const existing = getPersona(id);
  if (!existing) {
    throw new Error(`Persona not found: ${id}`);
  }

  const patch: Partial<typeof personas.$inferInsert> = {
    updatedAt: nowIso(),
  };

  if (data.name !== undefined) patch.name = data.name.trim();
  if (data.specialty !== undefined) {
    patch.specialty = data.specialty?.trim() || null;
  }
  if (data.description !== undefined) {
    patch.description = data.description?.trim() || null;
  }
  if (data.systemPromptOverride !== undefined) {
    const o = data.systemPromptOverride?.trim();
    patch.systemPromptOverride = o ? o : null;
  }
  if (data.isEnabled !== undefined) patch.isEnabled = data.isEnabled;

  getDb().update(personas).set(patch).where(eq(personas.id, id)).run();
  return getPersona(id)!;
}

/** Clear override so effective prompt falls back to built-in default. Built-ins only. */
export function resetPersonaPrompt(id: string) {
  bootstrapDb();
  const existing = getPersona(id);
  if (!existing) {
    throw new Error(`Persona not found: ${id}`);
  }
  if (!existing.isBuiltin) {
    throw new Error("resetPersonaPrompt is only supported for built-in personas");
  }
  getDb()
    .update(personas)
    .set({ systemPromptOverride: null, updatedAt: nowIso() })
    .where(eq(personas.id, id))
    .run();
  return getPersona(id)!;
}

export function deleteCustomPersona(id: string) {
  bootstrapDb();
  const existing = getPersona(id);
  if (!existing) {
    throw new Error(`Persona not found: ${id}`);
  }
  if (existing.isBuiltin) {
    throw new Error("Cannot delete a built-in persona");
  }
  getDb().delete(personas).where(eq(personas.id, id)).run();
}
