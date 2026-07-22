import { eq, desc, and, or, like, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { providers } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import type { ProviderInput } from "@/lib/validation/provider";

export function listProviders(filter?: { status?: string; q?: string }) {
  bootstrapDb();
  const conditions: SQL[] = [];

  if (filter?.status) {
    conditions.push(eq(providers.status, filter.status));
  }

  if (filter?.q?.trim()) {
    const pattern = `%${filter.q.trim()}%`;
    conditions.push(
      or(
        like(providers.name, pattern),
        like(providers.specialty, pattern),
        like(providers.organization, pattern),
        like(providers.notes, pattern),
      )!,
    );
  }

  const query = getDb().select().from(providers).orderBy(desc(providers.updatedAt));
  if (conditions.length === 0) return query.all();
  if (conditions.length === 1) return query.where(conditions[0]!).all();
  return query.where(and(...conditions)).all();
}

/** Active providers for clinical form dropdowns */
export function listActiveProviders() {
  return listProviders({ status: "active" });
}

/** Distinct facility/organization names from the provider list */
export function listFacilityOptions(): string[] {
  bootstrapDb();
  const rows = getDb().select({ organization: providers.organization }).from(providers).all();
  const set = new Set<string>();
  for (const row of rows) {
    const org = row.organization?.trim();
    if (org) set.add(org);
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}

export function getProvider(id: string) {
  bootstrapDb();
  return getDb().select().from(providers).where(eq(providers.id, id)).get();
}

export function createProvider(input: ProviderInput) {
  bootstrapDb();
  const id = newId();
  const t = nowIso();
  getDb()
    .insert(providers)
    .values({
      id,
      name: input.name.trim(),
      specialty: emptyToNull(input.specialty),
      organization: emptyToNull(input.organization),
      phone: emptyToNull(input.phone),
      email: emptyToNull(input.email),
      notes: emptyToNull(input.notes),
      status: input.status ?? "active",
      createdAt: t,
      updatedAt: t,
    })
    .run();
  return getProvider(id)!;
}

export function updateProvider(id: string, input: ProviderInput) {
  bootstrapDb();
  getDb()
    .update(providers)
    .set({
      name: input.name.trim(),
      specialty: emptyToNull(input.specialty),
      organization: emptyToNull(input.organization),
      phone: emptyToNull(input.phone),
      email: emptyToNull(input.email),
      notes: emptyToNull(input.notes),
      status: input.status ?? "active",
      updatedAt: nowIso(),
    })
    .where(eq(providers.id, id))
    .run();
  return getProvider(id)!;
}

export function deleteProvider(id: string) {
  bootstrapDb();
  getDb().delete(providers).where(eq(providers.id, id)).run();
}

function emptyToNull(v: string | null | undefined) {
  if (v == null || v === "") return null;
  return v;
}
