import { eq, desc, and, or, like, asc, type SQL } from "drizzle-orm";
import { getDb, getSqlite } from "@/server/db";
import { bootstrapDb } from "@/server/db/bootstrap";
import { labPanels, labResults } from "@/server/db/schema";
import { newId } from "@/lib/ids";
import { nowIso } from "@/lib/dates";
import type { LabPanelInput, LabResultInput } from "@/lib/validation/lab";
import { unlinkAllForEntity } from "@/server/services/documents";
import { ensureAnalyte } from "@/server/services/analytes";

export function listLabPanels(filter?: { q?: string }) {
  bootstrapDb();
  const conditions: SQL[] = [];

  if (filter?.q?.trim()) {
    const pattern = `%${filter.q.trim()}%`;
    conditions.push(
      or(
        like(labPanels.name, pattern),
        like(labPanels.facility, pattern),
        like(labPanels.notes, pattern),
      )!,
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  return getDb()
    .select()
    .from(labPanels)
    .where(where)
    .orderBy(desc(labPanels.collectedOn), desc(labPanels.createdAt))
    .all();
}

export function getLabPanel(id: string) {
  bootstrapDb();
  const panel = getDb().select().from(labPanels).where(eq(labPanels.id, id)).get();
  if (!panel) return undefined;

  const results = getDb()
    .select()
    .from(labResults)
    .where(eq(labResults.panelId, id))
    .orderBy(asc(labResults.analyteName))
    .all();

  return { ...panel, results };
}

export function createLabPanel(panelInput: LabPanelInput, results: LabResultInput[] = []) {
  bootstrapDb();
  const db = getDb();
  const id = newId();
  const t = nowIso();

  const tx = getSqlite().transaction(() => {
    db.insert(labPanels)
      .values({
        id,
        name: panelInput.name,
        collectedOn: panelInput.collectedOn || null,
        facility: panelInput.facility || null,
        status: panelInput.status ?? "final",
        notes: panelInput.notes || null,
        source: panelInput.source === "pdf_import" ? "pdf_import" : "manual",
        createdAt: t,
        updatedAt: t,
      })
      .run();

    for (const r of results) {
      ensureAnalyte(r.analyteName, r.unit);
      db.insert(labResults)
        .values({
          id: newId(),
          panelId: id,
          analyteName: r.analyteName,
          value: r.value ?? null,
          unit: r.unit ?? null,
          refLow: r.refLow ?? null,
          refHigh: r.refHigh ?? null,
          flag: r.flag ?? null,
          notes: r.notes ?? null,
          createdAt: t,
          updatedAt: t,
        })
        .run();
    }
  });
  tx();

  return getLabPanel(id)!;
}

export function updateLabPanel(
  id: string,
  panelInput: LabPanelInput,
  results: LabResultInput[] = [],
) {
  bootstrapDb();
  const db = getDb();
  const t = nowIso();

  const existing = db.select().from(labPanels).where(eq(labPanels.id, id)).get();
  if (!existing) {
    throw new Error(`Lab panel not found: ${id}`);
  }

  const tx = getSqlite().transaction(() => {
    db.update(labPanels)
      .set({
        name: panelInput.name,
        collectedOn: panelInput.collectedOn || null,
        facility: panelInput.facility || null,
        status: panelInput.status ?? "final",
        notes: panelInput.notes || null,
        updatedAt: t,
      })
      .where(eq(labPanels.id, id))
      .run();

    db.delete(labResults).where(eq(labResults.panelId, id)).run();

    for (const r of results) {
      ensureAnalyte(r.analyteName, r.unit);
      db.insert(labResults)
        .values({
          id: newId(),
          panelId: id,
          analyteName: r.analyteName,
          value: r.value ?? null,
          unit: r.unit ?? null,
          refLow: r.refLow ?? null,
          refHigh: r.refHigh ?? null,
          flag: r.flag ?? null,
          notes: r.notes ?? null,
          createdAt: t,
          updatedAt: t,
        })
        .run();
    }
  });
  tx();

  return getLabPanel(id)!;
}

export function deleteLabPanel(id: string) {
  bootstrapDb();
  unlinkAllForEntity("lab_panel", id);
  getDb().delete(labPanels).where(eq(labPanels.id, id)).run();
}
